import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.11.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    console.log(' Webhook received')
    
    // Get raw body
    const body = await req.text()
    console.log(' Body length:', body.length)
    
    // Parse the event
    const event = JSON.parse(body) as Stripe.Event
    console.log(' Event type:', event.type)
    console.log(' Event ID:', event.id)

    switch (event.type) {
      case 'payment_method.attached': {
        console.log(' Processing payment_method.attached')
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        
        console.log('Payment method ID:', paymentMethod.id)
        console.log('Customer ID:', paymentMethod.customer)
        console.log('Card details:', paymentMethod.card)
        
        if (paymentMethod.customer && paymentMethod.card) {
          try {
            // Get customer details from Stripe
            const customer = await stripe.customers.retrieve(paymentMethod.customer as string)
            console.log(' Customer retrieved:', customer.id)
            
            if (customer.deleted) {
              console.error(' Customer was deleted')
              break
            }

            console.log(' Customer metadata:', customer.metadata)
            const userId = customer.metadata?.supabase_user_id
            
            if (!userId) {
              console.error(' No supabase_user_id found in customer metadata')
              console.log('Available metadata keys:', Object.keys(customer.metadata || {}))
              break
            }

            console.log(' Found user ID:', userId)

            // Check if payment method already exists
            const { data: existingMethod, error: checkError } = await supabase
              .from('pg_payment_methods')
              .select('id')
              .eq('stripe_payment_method_id', paymentMethod.id)
              .single()

            console.log(' Existing method check:', { existingMethod, checkError })

            if (existingMethod) {
              console.log(' Payment method already exists:', paymentMethod.id)
              break
            }

            // Insert payment method
            const insertData = {
              user_id: userId,
              stripe_payment_method_id: paymentMethod.id,
              type: paymentMethod.type,
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
              is_default: false
            }

            console.log(' Inserting payment method:', insertData)

            const { data: insertResult, error: insertError } = await supabase
              .from('pg_payment_methods')
              .insert(insertData)
              .select()

            if (insertError) {
              console.error(' Error inserting payment method:', insertError)
              return new Response(JSON.stringify({ error: 'Database insert failed', details: insertError }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            console.log(' Payment method saved successfully:', insertResult)
          } catch (stripeError) {
            console.error(' Stripe API error:', stripeError)
          }
        } else {
          console.log(' Payment method missing customer or card details')
        }
        break
      }

      case 'payment_method.detached': {
        console.log(' Processing payment_method.detached')
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        
        const { error } = await supabase
          .from('pg_payment_methods')
          .delete()
          .eq('stripe_payment_method_id', paymentMethod.id)

        if (error) {
          console.error(' Error removing payment method:', error)
        } else {
          console.log(' Payment method removed successfully:', paymentMethod.id)
        }
        break
      }

      case 'payment_method.updated': {
        console.log(' Processing payment_method.updated')
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        
        if (paymentMethod.customer) {
          try {
            // Get customer details from Stripe
            const customer = await stripe.customers.retrieve(paymentMethod.customer as string)
            
            if (customer.deleted) {
              console.error(' Customer was deleted')
              break
            }

            const userId = customer.metadata?.supabase_user_id
            if (!userId) {
              console.error(' No supabase_user_id found in customer metadata')
              break
            }

            // Update payment method details in database
            const updateData = {
              type: paymentMethod.type,
              brand: paymentMethod.card?.brand,
              last4: paymentMethod.card?.last4,
              exp_month: paymentMethod.card?.exp_month,
              exp_year: paymentMethod.card?.exp_year,
            }

            console.log(' Updating payment method:', paymentMethod.id, updateData)

            const { error: updateError } = await supabase
              .from('pg_payment_methods')
              .update(updateData)
              .eq('stripe_payment_method_id', paymentMethod.id)

            if (updateError) {
              console.error(' Error updating payment method:', updateError)
            } else {
              console.log(' Payment method updated successfully:', paymentMethod.id)
            }
          } catch (stripeError) {
            console.error(' Stripe API error:', stripeError)
          }
        }
        break
      }

      case 'customer.updated': {
        console.log(' Processing customer.updated')
        const customer = event.data.object as Stripe.Customer
        
        if (customer.deleted) {
          console.log('Customer was deleted, skipping')
          break
        }

        const userId = customer.metadata?.supabase_user_id
        if (!userId) {
          console.error(' No supabase_user_id found in customer metadata')
          break
        }

        // Handle default payment method changes
        const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string | null
        console.log(' Default payment method from Stripe:', defaultPaymentMethodId)

        try {
          // First, clear all existing default flags for this user
          const { error: clearDefaultError } = await supabase
            .from('pg_payment_methods')
            .update({ is_default: false })
            .eq('user_id', userId)

          if (clearDefaultError) {
            console.error(' Failed to clear default payment methods:', clearDefaultError)
            break
          }

          // If there's a new default payment method, set it
          if (defaultPaymentMethodId) {
            const { error: setDefaultError } = await supabase
              .from('pg_payment_methods')
              .update({ is_default: true })
              .eq('user_id', userId)
              .eq('stripe_payment_method_id', defaultPaymentMethodId)

            if (setDefaultError) {
              console.error(' Failed to set new default payment method:', setDefaultError)
            } else {
              console.log(' Default payment method updated in database:', defaultPaymentMethodId)
            }
          } else {
            console.log(' No default payment method set (cleared all defaults)')
          }
        } catch (error) {
          console.error(' Error handling customer.updated:', error)
        }
        break
      }

      case 'payment_intent.succeeded': {
        console.log(' Processing payment_intent.succeeded')
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        const { error } = await supabase
          .from('pg_transactions')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (error) {
          console.error(' Error updating transaction status:', error)
        } else {
          console.log(' Transaction status updated to succeeded:', paymentIntent.id)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        console.log(' Processing payment_intent.payment_failed')
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        const { error } = await supabase
          .from('pg_transactions')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (error) {
          console.error(' Error updating transaction status:', error)
        } else {
          console.log(' Transaction status updated to failed:', paymentIntent.id)
        }
        break
      }

      default:
        console.log(' Unhandled event type:', event.type)
    }

    console.log(' Webhook processed successfully')
    return new Response(JSON.stringify({ received: true, event_type: event.type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(' Webhook error:', error)
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed', 
      message: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
