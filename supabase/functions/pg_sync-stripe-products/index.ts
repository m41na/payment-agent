import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log('🚀 Starting Stripe product sync...')

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment')
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing')
      throw new Error('Supabase configuration not found')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    console.log('✅ Initialized Stripe and Supabase clients')

    // Fetch all products from Stripe
    console.log('📦 Fetching products from Stripe...')
    const products = await stripe.products.list({ 
      active: true,
      limit: 100 
    })

    console.log(`📦 Found ${products.data.length} active products in Stripe`)

    if (products.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active products found in Stripe',
        synced: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let syncedCount = 0
    let errors = []

    // Process each product
    for (const product of products.data) {
      try {
        console.log(`🔄 Processing product: ${product.name} (${product.id})`)

        // Fetch all prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100
        })

        console.log(`💰 Found ${prices.data.length} prices for product ${product.name}`)

        if (prices.data.length === 0) {
          console.log(`⚠️ Skipping product ${product.name} - no active prices`)
          continue
        }

        // Process each price
        for (const price of prices.data) {
          try {
            console.log(`💳 Processing price: ${price.id} - ${price.unit_amount} ${price.currency}`)

            const planData = {
              stripe_product_id: product.id,
              stripe_price_id: price.id,
              name: product.name,
              description: product.description || '',
              price_amount: price.unit_amount || 0,
              price_currency: price.currency,
              billing_interval: price.recurring?.interval || 'one_time',
              is_active: product.active && price.active,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            console.log('📝 Plan data to upsert:', JSON.stringify(planData, null, 2))

            // Upsert plan to database
            const { data, error } = await supabaseClient
              .from('pg_merchant_plans')
              .upsert(planData, {
                onConflict: 'stripe_price_id'
              })
              .select()

            if (error) {
              console.error(`❌ Database error for price ${price.id}:`, error)
              errors.push({
                product_id: product.id,
                price_id: price.id,
                error: error.message || 'Unknown database error'
              })
            } else {
              console.log(`✅ Successfully synced price ${price.id}`)
              syncedCount++
            }

          } catch (priceError) {
            console.error(`❌ Error processing price ${price.id}:`, priceError)
            errors.push({
              product_id: product.id,
              price_id: price.id,
              error: priceError.message || 'Unknown price processing error'
            })
          }
        }

      } catch (productError) {
        console.error(`❌ Error processing product ${product.id}:`, productError)
        errors.push({
          product_id: product.id,
          error: productError.message || 'Unknown product processing error'
        })
      }
    }

    // Clean up inactive products
    console.log('🧹 Cleaning up inactive products...')
    const activeProductIds = products.data.map(p => p.id)
    
    if (activeProductIds.length > 0) {
      const { error: deactivateError } = await supabaseClient
        .from('pg_merchant_plans')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .not('stripe_product_id', 'in', `(${activeProductIds.map(id => `"${id}"`).join(',')})`)

      if (deactivateError) {
        console.error('❌ Error deactivating old products:', deactivateError)
        errors.push({
          operation: 'deactivate_old_products',
          error: deactivateError.message || 'Unknown deactivation error'
        })
      } else {
        console.log('✅ Deactivated products no longer in Stripe')
      }
    }

    const response = {
      success: errors.length === 0,
      message: `Sync completed. ${syncedCount} plans synced.`,
      synced: syncedCount,
      total_products: products.data.length,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('🎉 Sync summary:', JSON.stringify(response, null, 2))

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('💥 Fatal sync error:', error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
