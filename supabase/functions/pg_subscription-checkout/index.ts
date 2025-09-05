import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.9.0?target=deno'

// Constants for type safety and clarity
const PAYMENT_OPTIONS = {
  EXPRESS: 'express',
  ONE_TIME: 'one_time', 
  SAVED: 'saved'
} as const

const VALIDITY_PERIOD = {
  ONE_DAY: 'one_time',
  MONTH: 'month',
  YEAR: 'year'
} as const

const SUBSCRIPTION_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring'
} as const

type PaymentOption = typeof PAYMENT_OPTIONS[keyof typeof PAYMENT_OPTIONS]
type ValidityPeriod = typeof VALIDITY_PERIOD[keyof typeof VALIDITY_PERIOD]
type SubscriptionType = typeof SUBSCRIPTION_TYPES[keyof typeof SUBSCRIPTION_TYPES]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Centralized function to resolve payment method ID from UUID to Stripe ID
async function resolvePaymentMethodId(paymentMethodUuid: string): Promise<string> {
  const { data: paymentMethod, error: pmError } = await supabaseClient
    .from('pg_payment_methods')
    .select('stripe_payment_method_id')
    .eq('id', paymentMethodUuid)
    .single()

  if (pmError || !paymentMethod) {
    throw new Error(`Payment method not found: ${paymentMethodUuid}`)
  }

  console.log(`Resolved payment method ${paymentMethodUuid} -> ${paymentMethod.stripe_payment_method_id}`);
  return paymentMethod.stripe_payment_method_id
}

// Universal payment method processing - works for any product/amount
async function processPaymentMethod(
  paymentMethodId: string | undefined,
  paymentOption: string,
  userId: string
): Promise<{ paymentMethodId: string | null; requiresSetup: boolean }> {
  
  if (paymentMethodId) {
    // Specific payment method provided - resolve and use it
    const resolvedPaymentMethodId = await resolvePaymentMethodId(paymentMethodId)
    return { paymentMethodId: resolvedPaymentMethodId, requiresSetup: false }
  }
  
  if (paymentOption === PAYMENT_OPTIONS.EXPRESS) {
    // Express checkout - find/set default payment method
    const resolvedPaymentMethodId = await resolveExpressPaymentMethod(userId)
    return { 
      paymentMethodId: resolvedPaymentMethodId, 
      requiresSetup: resolvedPaymentMethodId === null 
    }
  }
  
  // No payment method provided - requires setup
  return { paymentMethodId: null, requiresSetup: true }
}

async function resolveExpressPaymentMethod(userId: string): Promise<string | null> {
  // Find and use default payment method
  const { data: defaultPaymentMethod, error: pmError } = await supabaseClient
    .from('pg_payment_methods')
    .select('stripe_payment_method_id')
    .eq('buyer_id', userId)
    .eq('is_default', true)
    .single()

  if (!pmError && defaultPaymentMethod) {
    console.log('Express checkout using default payment method:', defaultPaymentMethod.stripe_payment_method_id);
    return defaultPaymentMethod.stripe_payment_method_id
  } else {
    // No default found, get first payment method and set it as default
    const { data: firstPaymentMethod, error: firstPmError } = await supabaseClient
      .from('pg_payment_methods')
      .select('id, stripe_payment_method_id')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!firstPmError && firstPaymentMethod) {
      console.log('Setting first payment method as default for express checkout:', firstPaymentMethod.stripe_payment_method_id);
      
      // Set as default in database
      await supabaseClient
        .from('pg_payment_methods')
        .update({ is_default: true })
        .eq('id', firstPaymentMethod.id)

      // Use for payment
      return firstPaymentMethod.stripe_payment_method_id
    } else {
      console.log('No payment methods found for express checkout, requires payment sheet');
      return null
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
    console.error('Error in subscription checkout:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
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
    payment_option?: typeof PAYMENT_OPTIONS[keyof typeof PAYMENT_OPTIONS]
  }
) {
  console.log('createSubscription called with:', {
    userId: user.id,
    subscriptionData,
    timestamp: new Date().toISOString()
  });

  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_customer_id, merchant_status, subscription_status')
    .eq('id', user.id)
    .single()

  console.log('Profile lookup result:', { profile, profileError });

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  // Check if user already has active subscription
  if (profile.subscription_status === 'active') {
    // Double-check by looking at actual subscription records
    const { data: activeSubscriptions } = await supabaseClient
      .from('pg_user_subscriptions')
      .select('expires_at, status')
      .eq('user_id', profile.id)
      .eq('status', 'active');

    // Check if any active subscriptions are actually still valid (not expired)
    const hasValidSubscription = activeSubscriptions?.some(sub => 
      !sub.expires_at || new Date(sub.expires_at) > new Date()
    );

    if (hasValidSubscription) {
      throw new Error('User already has an active subscription')
    }
  }

  // Get merchant plan from new table
  console.log('Looking up merchant plan:', subscriptionData.plan_id)
  
  const { data: plan, error: planError } = await supabaseClient
    .from('pg_merchant_plans')
    .select('*')
    .eq('id', subscriptionData.plan_id)
    .eq('is_active', true)
    .single()

  console.log('Plan lookup result:', { plan, planError })

  if (planError) {
    console.error('Plan lookup error:', planError)
    throw new Error(`Plan lookup failed: ${planError.message}`)
  }
  
  if (!plan) {
    // Try to find any plan with this ID (even inactive ones)
    const { data: anyPlan } = await supabaseClient
      .from('pg_merchant_plans')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single()
    
    if (anyPlan) {
      throw new Error(`Plan "${subscriptionData.plan_id}" exists but is not active`)
    } else {
      throw new Error(`Plan "${subscriptionData.plan_id}" not found in database`)
    }
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

  // Route based on payment method, not plan type (product-agnostic payment processing)
  if (subscriptionData.payment_option === PAYMENT_OPTIONS.ONE_TIME) {
    // One-time payment flow - works for any plan type
    return await createOneTimePayment(stripe, supabaseClient, user, plan, customerId, subscriptionData)
  }

  // Recurring subscription flow for saved/express payment methods
  // Works for any plan type - the payment method is independent of the product
  const subscriptionParams: any = {
    customer: customerId,
    items: [{ price: plan.stripe_price_id }],
    payment_settings: { 
      save_default_payment_method: subscriptionData.payment_option === PAYMENT_OPTIONS.EXPRESS ? 'on_subscription' : 'off'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
    },
  }

  // Handle payment method and behavior
  const paymentMethodResult = await processPaymentMethod(subscriptionData.payment_method_id, subscriptionData.payment_option, user.id)
  
  if (paymentMethodResult.paymentMethodId) {
    subscriptionParams.default_payment_method = paymentMethodResult.paymentMethodId
    subscriptionParams.payment_behavior = 'allow_incomplete'
  } else {
    subscriptionParams.payment_behavior = 'default_incomplete'
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
      type: SUBSCRIPTION_TYPES.RECURRING,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .select()

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
    type: SUBSCRIPTION_TYPES.RECURRING,
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

async function createOneTimePayment(
  stripe: Stripe,
  supabaseClient: any,
  user: any,
  plan: any,
  customerId: string,
  subscriptionData: any
) {
  // Create payment intent for one-time payment
  const paymentIntentParams: any = {
    amount: plan.price_amount,
    currency: plan.price_currency,
    customer: customerId,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      type: 'one_time_merchant_access',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  }

  const paymentMethodResult = await processPaymentMethod(subscriptionData.payment_method_id, subscriptionData.payment_option, user.id)
  
  if (paymentMethodResult.paymentMethodId) {
    paymentIntentParams.payment_method = paymentMethodResult.paymentMethodId
    paymentIntentParams.confirm = true
    delete paymentIntentParams.automatic_payment_methods
  }
  // For one-time payments without payment method, leave automatic_payment_methods enabled

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

  // Calculate expiry time based on plan's validity period
  const expiresAt = new Date()
  if (plan.billing_interval === VALIDITY_PERIOD.ONE_DAY) {
    expiresAt.setHours(expiresAt.getHours() + 24)
  } else if (plan.billing_interval === VALIDITY_PERIOD.MONTH) {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else if (plan.billing_interval === VALIDITY_PERIOD.YEAR) {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  // Save one-time payment to database
  const { data: dbSubscription, error: subscriptionError } = await supabaseClient
    .from('pg_user_subscriptions')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      stripe_payment_intent_id: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'active' : 'pending',
      type: SUBSCRIPTION_TYPES.ONE_TIME,
      expires_at: expiresAt.toISOString(),
      purchased_at: new Date().toISOString(),
    })
    .select()

  if (subscriptionError) {
    // Cleanup: cancel the payment intent if database insert fails
    if (paymentIntent.status !== 'succeeded') {
      await stripe.paymentIntents.cancel(paymentIntent.id)
    }
    throw new Error(`Database error: ${subscriptionError.message}`)
  }

  // Update user profile if payment succeeded
  if (paymentIntent.status === 'succeeded') {
    console.log('Payment succeeded, updating profile for user:', user.id);
    console.log('Updating profile with plan_id:', plan.id);
    
    const { error: profileUpdateError } = await supabaseClient
      .from('pg_profiles')
      .update({
        current_plan_id: plan.id,
        subscription_status: 'active',
        merchant_status: 'plan_purchased',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileUpdateError) {
      console.error('Profile update failed:', profileUpdateError);
      // Don't throw error, just log it since payment already succeeded
    } else {
      console.log('Profile updated successfully');
      
      // Also update user metadata so client can access updated status
      const { error: metadataError } = await supabaseClient.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            subscription_status: 'active',
            merchant_status: 'plan_purchased',
            current_plan_id: plan.id
          }
        }
      );
      
      if (metadataError) {
        console.error('User metadata update failed:', metadataError);
      } else {
        console.log('User metadata updated successfully');
      }
    }
  }

  const result: any = {
    success: true,
    payment_intent_id: paymentIntent.id,
    status: paymentIntent.status,
    type: SUBSCRIPTION_TYPES.ONE_TIME,
    expires_at: expiresAt.toISOString(),
  }

  // If payment requires action, include client secret
  if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method') {
    result.client_secret = paymentIntent.client_secret
    result.requires_action = true

    // Update user profile
    await supabaseClient
      .from('pg_profiles')
      .update({
        current_plan_id: plan.id,
        subscription_status: 'pending',
        merchant_status: 'plan_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  }

  return new Response(
    JSON.stringify(result),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}
