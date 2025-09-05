import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  action: 'create_payment_intent' | 'confirm_payment' | 'get_payment_status';
  productId?: string;
  quantity?: number;
  paymentIntentId?: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  seller_id: string;
  is_available: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, productId, quantity = 1, paymentIntentId }: PaymentRequest = await req.json()

    switch (action) {
      case 'create_payment_intent': {
        if (!productId) {
          return new Response(
            JSON.stringify({ error: 'Product ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get product details
        const { data: product, error: productError } = await supabaseClient
          .from('pg_products')
          .select('*')
          .eq('id', productId)
          .eq('is_available', true)
          .single()

        if (productError || !product) {
          return new Response(
            JSON.stringify({ error: 'Product not found or unavailable' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prevent self-purchase
        if (product.seller_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot purchase your own product' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get seller's Stripe Connect account
        const { data: sellerAccount, error: accountError } = await supabaseClient
          .from('pg_stripe_connect_accounts')
          .select('*')
          .eq('user_id', product.seller_id)
          .eq('charges_enabled', true)
          .single()

        if (accountError || !sellerAccount) {
          return new Response(
            JSON.stringify({ error: 'Seller account not available for payments' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate amounts
        const productAmount = Math.round(product.price * quantity * 100) // Convert to cents
        const platformFeeRate = 0.05 // 5% platform fee
        const platformFee = Math.round(productAmount * platformFeeRate)

        // Create payment intent with destination charge
        const paymentIntent = await stripe.paymentIntents.create({
          amount: productAmount,
          currency: 'usd',
          application_fee_amount: platformFee,
          transfer_data: {
            destination: sellerAccount.stripe_account_id,
          },
          metadata: {
            product_id: productId,
            seller_id: product.seller_id,
            buyer_id: user.id,
            quantity: quantity.toString(),
            platform_fee: platformFee.toString(),
          },
        })

        // Create transaction record using existing table structure
        const { error: transactionError } = await supabaseClient
          .from('pg_transactions')
          .insert({
            buyer_id: user.id,
            seller_id: product.seller_id,
            stripe_payment_intent_id: paymentIntent.id,
            amount: productAmount, // Store in cents (existing column)
            currency: 'usd',
            status: 'pending',
            description: `Purchase: ${product.title}`,
            stripe_connect_account_id: sellerAccount.stripe_account_id,
            transaction_type: 'payment',
            metadata: {
              product_id: productId,
              product_title: product.title,
              product_price: product.price,
              quantity: quantity,
              platform_fee: platformFee,
            },
          })

        if (transactionError) {
          console.error('Transaction record error:', transactionError)
          // Continue anyway - payment intent was created
        }

        return new Response(
          JSON.stringify({
            paymentIntent: {
              id: paymentIntent.id,
              client_secret: paymentIntent.client_secret,
              amount: productAmount,
              platform_fee: platformFee,
            },
            product: {
              id: product.id,
              title: product.title,
              price: product.price,
              quantity,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'confirm_payment': {
        if (!paymentIntentId) {
          return new Response(
            JSON.stringify({ error: 'Payment Intent ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

        // Update transaction status
        const { error: updateError } = await supabaseClient
          .from('pg_transactions')
          .update({
            status: paymentIntent.status,
          })
          .eq('stripe_payment_intent_id', paymentIntentId)

        if (updateError) {
          console.error('Transaction update error:', updateError)
        }

        // If payment succeeded, update product availability if needed
        if (paymentIntent.status === 'succeeded') {
          const productId = paymentIntent.metadata.product_id
          const quantity = parseInt(paymentIntent.metadata.quantity || '1')

          // Get current product
          const { data: product } = await supabaseClient
            .from('pg_products')
            .select('inventory_count')
            .eq('id', productId)
            .single()

          if (product && product.inventory_count !== null) {
            const newInventory = Math.max(0, product.inventory_count - quantity)
            
            await supabaseClient
              .from('pg_products')
              .update({
                inventory_count: newInventory,
                is_available: newInventory > 0,
              })
              .eq('id', productId)
          }
        }

        return new Response(
          JSON.stringify({
            status: paymentIntent.status,
            paymentIntent: {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_payment_status': {
        if (!paymentIntentId) {
          return new Response(
            JSON.stringify({ error: 'Payment Intent ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get transaction from database
        const { data: transaction, error: transactionError } = await supabaseClient
          .from('pg_transactions')
          .select(`
            *,
            seller:pg_profiles!seller_id(display_name),
            buyer:pg_profiles!buyer_id(display_name)
          `)
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single()

        if (transactionError || !transaction) {
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ transaction }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Marketplace payments error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
