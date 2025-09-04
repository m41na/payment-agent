import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

console.log('pg_create-payment-intent function loaded')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Function called:', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing payment intent request')
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      console.log('User not authenticated')
      throw new Error('User not authenticated')
    }

    console.log('User authenticated:', user.id)

    const { amount, currency = 'usd', description, paymentMethodId } = await req.json()

    console.log('Payment intent request:', { amount, currency, description, paymentMethodId })

    // Check if Stripe secret key is available
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable not set')
      throw new Error('Stripe configuration missing')
    }

    console.log('Stripe key available:', stripeSecretKey.substring(0, 10) + '...')

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    console.log('Stripe initialized, fetching customer profile...')

    // Get or create Stripe customer
    let { data: profile, error: profileError } = await supabaseClient
      .from('pg_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    console.log('Profile query result:', { profile, profileError })

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      console.log('No customer ID found, creating Stripe customer...')
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id
      console.log('Created Stripe customer:', customerId)

      // Update profile with Stripe customer ID
      const { error: updateError } = await supabaseClient
        .from('pg_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Failed to update profile:', updateError)
      } else {
        console.log('Updated profile with customer ID')
      }
    } else {
      console.log('Using existing customer ID:', customerId)
    }

    console.log('Creating payment intent...')

    // Create payment intent
    const paymentIntentData: any = {
      amount: amount, // Amount is already in cents from client
      currency,
      customer: customerId,
      metadata: {
        supabase_user_id: user.id,
      },
    }

    if (description) {
      paymentIntentData.description = description
    }

    if (paymentMethodId) {
      // Express checkout with existing payment method
      paymentIntentData.payment_method = paymentMethodId
      paymentIntentData.confirmation_method = 'manual'
      paymentIntentData.confirm = true
      paymentIntentData.payment_method_types = ['card']
    } else {
      // Regular payment intent for payment sheet
      paymentIntentData.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'never'
      }
    }

    console.log('Payment intent data:', JSON.stringify(paymentIntentData, null, 2))

    try {
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)
      console.log('Payment intent created successfully:', paymentIntent.id)

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (stripeError) {
      console.error('Stripe payment intent creation failed:', stripeError)
      throw stripeError
    }
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
