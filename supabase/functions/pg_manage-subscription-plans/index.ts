import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2022-11-15',
    })

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('pg_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      throw new Error('Admin access required')
    }

    const { action, planData } = await req.json()

    switch (action) {
      case 'create_plan':
        return await createSubscriptionPlan(stripe, supabaseClient, planData)
      case 'update_plan':
        return await updateSubscriptionPlan(stripe, supabaseClient, planData)
      case 'deactivate_plan':
        return await deactivateSubscriptionPlan(supabaseClient, planData.id)
      case 'sync_from_stripe':
        return await syncPlansFromStripe(stripe, supabaseClient)
      case 'list_plans':
        return await listSubscriptionPlans(supabaseClient)
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

async function createSubscriptionPlan(
  stripe: Stripe,
  supabaseClient: any,
  planData: {
    name: string
    description?: string
    price_amount: number
    price_currency: string
    billing_interval: 'month' | 'year'
    features: string[]
  }
) {
  // Create Stripe Product
  const product = await stripe.products.create({
    name: planData.name,
    description: planData.description,
    metadata: {
      features: JSON.stringify(planData.features),
    },
  })

  // Create Stripe Price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: planData.price_amount,
    currency: planData.price_currency,
    recurring: {
      interval: planData.billing_interval,
    },
  })

  // Save to database
  const { data: plan, error } = await supabaseClient
    .from('pg_subscription_plans')
    .insert({
      name: planData.name,
      description: planData.description,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      price_amount: planData.price_amount,
      price_currency: planData.price_currency,
      billing_interval: planData.billing_interval,
      features: planData.features,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    // Cleanup Stripe resources if database insert fails
    await stripe.products.del(product.id)
    throw new Error(`Database error: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, plan }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function updateSubscriptionPlan(
  stripe: Stripe,
  supabaseClient: any,
  planData: {
    id: string
    name?: string
    description?: string
    features?: string[]
    is_active?: boolean
  }
) {
  // Get existing plan
  const { data: existingPlan, error: fetchError } = await supabaseClient
    .from('pg_subscription_plans')
    .select('*')
    .eq('id', planData.id)
    .single()

  if (fetchError || !existingPlan) {
    throw new Error('Plan not found')
  }

  // Update Stripe Product if name or description changed
  if (planData.name || planData.description || planData.features) {
    await stripe.products.update(existingPlan.stripe_product_id, {
      ...(planData.name && { name: planData.name }),
      ...(planData.description && { description: planData.description }),
      ...(planData.features && { 
        metadata: { features: JSON.stringify(planData.features) }
      }),
    })
  }

  // Update database
  const { data: updatedPlan, error } = await supabaseClient
    .from('pg_subscription_plans')
    .update({
      ...(planData.name && { name: planData.name }),
      ...(planData.description && { description: planData.description }),
      ...(planData.features && { features: planData.features }),
      ...(planData.is_active !== undefined && { is_active: planData.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planData.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, plan: updatedPlan }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function deactivateSubscriptionPlan(supabaseClient: any, planId: string) {
  const { data: plan, error } = await supabaseClient
    .from('pg_subscription_plans')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, plan }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function syncPlansFromStripe(stripe: Stripe, supabaseClient: any) {
  // Get all products from Stripe
  const products = await stripe.products.list({ limit: 100 })
  const syncedPlans = []

  for (const product of products.data) {
    // Get prices for this product
    const prices = await stripe.prices.list({ 
      product: product.id,
      type: 'recurring',
      limit: 10,
    })

    for (const price of prices.data) {
      if (!price.recurring) continue

      // Check if plan already exists
      const { data: existingPlan } = await supabaseClient
        .from('pg_subscription_plans')
        .select('id')
        .eq('stripe_product_id', product.id)
        .eq('stripe_price_id', price.id)
        .single()

      if (!existingPlan) {
        // Create new plan
        const features = product.metadata?.features 
          ? JSON.parse(product.metadata.features)
          : []

        const { data: newPlan, error } = await supabaseClient
          .from('pg_subscription_plans')
          .insert({
            name: product.name,
            description: product.description,
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            price_amount: price.unit_amount || 0,
            price_currency: price.currency,
            billing_interval: price.recurring.interval,
            features,
            is_active: product.active && price.active,
          })
          .select()
          .single()

        if (!error) {
          syncedPlans.push(newPlan)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      synced_plans: syncedPlans.length,
      plans: syncedPlans 
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function listSubscriptionPlans(supabaseClient: any) {
  const { data: plans, error } = await supabaseClient
    .from('pg_subscription_plans')
    .select('*')
    .order('price_amount', { ascending: true })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ success: true, plans }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}
