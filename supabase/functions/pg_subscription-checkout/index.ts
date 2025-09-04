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

    const { action, subscriptionData } = await req.json()

    switch (action) {
      case 'create_subscription':
        return await createSubscription(stripe, supabaseClient, user, subscriptionData)
      case 'cancel_subscription':
        return await cancelSubscription(stripe, supabaseClient, user)
      case 'update_subscription':
        return await updateSubscription(stripe, supabaseClient, user, subscriptionData)
      case 'get_subscription_status':
        return await getSubscriptionStatus(stripe, supabaseClient, user)
      case 'preview_subscription':
        return await previewSubscription(stripe, supabaseClient, user, subscriptionData)
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

async function createSubscription(
  stripe: Stripe, 
  supabaseClient: any, 
  user: any,
  subscriptionData: {
    plan_id: string
    payment_method_id?: string
  }
) {
  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_customer_id, merchant_status, subscription_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  // Check if user already has active subscription
  if (profile.subscription_status === 'active') {
    throw new Error('User already has an active subscription')
  }

  // Get subscription plan
  const { data: plan, error: planError } = await supabaseClient
    .from('pg_subscription_plans')
    .select('*')
    .eq('id', subscriptionData.plan_id)
    .eq('is_active', true)
    .single()

  if (planError || !plan) {
    throw new Error('Subscription plan not found')
  }

  // Ensure user has Stripe customer ID
  let customerId = profile.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
      },
    })
    customerId = customer.id

    // Update profile with customer ID
    await supabaseClient
      .from('pg_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Create subscription
  const subscriptionParams: any = {
    customer: customerId,
    items: [{ price: plan.stripe_price_id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
    },
  }

  // If payment method provided, attach it
  if (subscriptionData.payment_method_id) {
    subscriptionParams.default_payment_method = subscriptionData.payment_method_id
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams)

  // Save subscription to database
  const { data: dbSubscription, error: subscriptionError } = await supabaseClient
    .from('pg_user_subscriptions')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .select()
    .single()

  if (subscriptionError) {
    // Cleanup: cancel the Stripe subscription if database insert fails
    await stripe.subscriptions.del(subscription.id)
    throw new Error(`Database error: ${subscriptionError.message}`)
  }

  // Update user profile
  await supabaseClient
    .from('pg_profiles')
    .update({
      current_plan_id: plan.id,
      subscription_status: subscription.status === 'active' ? 'active' : 'none',
      merchant_status: subscription.status === 'active' ? 'plan_purchased' : profile.merchant_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  const result: any = {
    success: true,
    subscription_id: subscription.id,
    status: subscription.status,
  }

  // If subscription requires payment confirmation
  if (subscription.latest_invoice?.payment_intent) {
    const paymentIntent = subscription.latest_invoice.payment_intent as any
    result.client_secret = paymentIntent.client_secret
    result.requires_action = paymentIntent.status === 'requires_action'
  }

  return new Response(
    JSON.stringify(result),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function cancelSubscription(stripe: Stripe, supabaseClient: any, user: any) {
  // Get user's current subscription
  const { data: subscription, error: subError } = await supabaseClient
    .from('pg_user_subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (subError || !subscription) {
    throw new Error('No active subscription found')
  }

  // Cancel subscription in Stripe (at period end)
  const stripeSubscription = await stripe.subscriptions.update(
    subscription.stripe_subscription_id,
    { cancel_at_period_end: true }
  )

  // Update database
  await supabaseClient
    .from('pg_user_subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.stripe_subscription_id)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the current period',
      period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function updateSubscription(
  stripe: Stripe, 
  supabaseClient: any, 
  user: any,
  subscriptionData: { new_plan_id: string }
) {
  // Get current subscription
  const { data: currentSub, error: subError } = await supabaseClient
    .from('pg_user_subscriptions')
    .select('*, pg_subscription_plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (subError || !currentSub) {
    throw new Error('No active subscription found')
  }

  // Get new plan
  const { data: newPlan, error: planError } = await supabaseClient
    .from('pg_subscription_plans')
    .select('*')
    .eq('id', subscriptionData.new_plan_id)
    .eq('is_active', true)
    .single()

  if (planError || !newPlan) {
    throw new Error('New subscription plan not found')
  }

  // Update subscription in Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)
  const updatedSubscription = await stripe.subscriptions.update(
    currentSub.stripe_subscription_id,
    {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPlan.stripe_price_id,
      }],
      proration_behavior: 'create_prorations',
    }
  )

  // Update database
  await supabaseClient
    .from('pg_user_subscriptions')
    .update({
      plan_id: newPlan.id,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', currentSub.stripe_subscription_id)

  // Update user profile
  await supabaseClient
    .from('pg_profiles')
    .update({
      current_plan_id: newPlan.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Subscription updated successfully',
      new_plan: newPlan.name
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function getSubscriptionStatus(stripe: Stripe, supabaseClient: any, user: any) {
  // Get user subscription from database
  const { data: subscription, error: subError } = await supabaseClient
    .from('pg_user_subscriptions')
    .select('*, pg_subscription_plans(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subError || !subscription) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        has_subscription: false,
        subscription: null
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // Get fresh status from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)

  // Update database if status changed
  if (stripeSubscription.status !== subscription.status) {
    await supabaseClient
      .from('pg_user_subscriptions')
      .update({
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id)

    // Update user profile subscription status
    await supabaseClient
      .from('pg_profiles')
      .update({
        subscription_status: stripeSubscription.status === 'active' ? 'active' : stripeSubscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      has_subscription: true,
      subscription: {
        ...subscription,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      }
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function previewSubscription(
  stripe: Stripe, 
  supabaseClient: any, 
  user: any,
  subscriptionData: { plan_id: string }
) {
  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.stripe_customer_id) {
    throw new Error('User must have payment method before previewing subscription')
  }

  // Get subscription plan
  const { data: plan, error: planError } = await supabaseClient
    .from('pg_subscription_plans')
    .select('*')
    .eq('id', subscriptionData.plan_id)
    .eq('is_active', true)
    .single()

  if (planError || !plan) {
    throw new Error('Subscription plan not found')
  }

  // Create preview invoice
  const invoice = await stripe.invoices.create({
    customer: profile.stripe_customer_id,
    subscription_items: [{ price: plan.stripe_price_id }],
    currency: plan.price_currency,
  })

  const previewInvoice = await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false })

  return new Response(
    JSON.stringify({ 
      success: true, 
      preview: {
        amount_due: previewInvoice.amount_due,
        currency: previewInvoice.currency,
        tax: previewInvoice.tax,
        total: previewInvoice.total,
        subtotal: previewInvoice.subtotal,
        period_start: new Date(previewInvoice.period_start! * 1000).toISOString(),
        period_end: new Date(previewInvoice.period_end! * 1000).toISOString(),
      }
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}
