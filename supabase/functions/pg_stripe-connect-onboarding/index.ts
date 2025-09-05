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

    const { action, accountData } = await req.json()

    switch (action) {
      case 'create_connect_account':
        return await createConnectAccount(stripe, supabaseClient, user)
      case 'create_onboarding_link':
        return await createOnboardingLink(stripe, supabaseClient, user, accountData)
      case 'get_account_status':
        return await getAccountStatus(stripe, supabaseClient, user)
      case 'refresh_onboarding_link':
        return await refreshOnboardingLink(stripe, supabaseClient, user)
      case 'handle_onboarding_return':
        return await handleOnboardingReturn(stripe, supabaseClient, user)
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Error in stripe-connect-onboarding:', error)
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

async function createConnectAccount(stripe: Stripe, supabaseClient: any, user: any) {
  console.log('Creating Connect account for user:', user.id)
  
  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile error:', profileError)
    throw new Error('User profile not found')
  }

  console.log('User profile found:', profile.id)

  // Check if user has active subscription by querying user subscriptions table
  const { data: subscription, error: subscriptionError } = await supabaseClient
    .from('pg_user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  console.log('Subscription query result:', { subscription, subscriptionError })

  if (subscriptionError) {
    // If it's just "no rows returned", that's different from a real error
    if (subscriptionError.code === 'PGRST116') {
      throw new Error('No active subscription found. Please purchase a subscription first.')
    } else {
      console.error('Subscription query error:', subscriptionError)
      throw new Error('Error checking subscription status')
    }
  }

  if (!subscription) {
    throw new Error('Active subscription required for merchant onboarding')
  }

  console.log('Active subscription found:', subscription.id)

  // Check if Connect account already exists
  if (profile.stripe_connect_account_id) {
    throw new Error('Connect account already exists')
  }

  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US', // You might want to make this configurable
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual', // Default to individual, can be updated during onboarding
    metadata: {
      user_id: user.id,
      email: user.email,
    },
  })

  // Update user profile with Connect account ID
  const { error: updateError } = await supabaseClient
    .from('pg_profiles')
    .update({
      stripe_connect_account_id: account.id,
      merchant_status: 'onboarding_started',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    // Cleanup: delete the Stripe account if database update fails
    await stripe.accounts.del(account.id)
    throw new Error(`Database error: ${updateError.message}`)
  }

  // Log the event
  await supabaseClient
    .from('pg_merchant_onboarding_logs')
    .insert({
      user_id: user.id,
      event_type: 'connect_account_created',
      event_data: {
        stripe_account_id: account.id,
        account_type: account.type,
      },
    })

  return new Response(
    JSON.stringify({ 
      success: true, 
      account_id: account.id,
      next_step: 'create_onboarding_link'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function createOnboardingLink(
  stripe: Stripe, 
  supabaseClient: any, 
  user: any,
  accountData: { return_url: string; refresh_url: string }
) {
  // Get user profile with Connect account
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_connect_account_id, merchant_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.stripe_connect_account_id) {
    throw new Error('Connect account not found')
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: profile.stripe_connect_account_id,
    refresh_url: accountData.refresh_url,
    return_url: accountData.return_url,
    type: 'account_onboarding',
  })

  // Update profile with onboarding URL
  const { error: updateError } = await supabaseClient
    .from('pg_profiles')
    .update({
      onboarding_url: accountLink.url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Database error: ${updateError.message}`)
  }

  // Log the event
  await supabaseClient
    .from('pg_merchant_onboarding_logs')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_link_created',
      event_data: {
        stripe_account_id: profile.stripe_connect_account_id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
    })

  return new Response(
    JSON.stringify({ 
      success: true, 
      onboarding_url: accountLink.url,
      expires_at: accountLink.expires_at
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function getAccountStatus(stripe: Stripe, supabaseClient: any, user: any) {
  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_connect_account_id, merchant_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.stripe_connect_account_id) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        account_status: 'not_created',
        merchant_status: profile?.merchant_status || 'none'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // Get account details from Stripe
  const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)

  const accountStatus = {
    id: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements: account.requirements,
    business_type: account.business_type,
    country: account.country,
  }

  // Determine if onboarding is complete
  const isOnboardingComplete = account.details_submitted && 
                              account.charges_enabled && 
                              account.payouts_enabled

  // Update merchant status if onboarding is complete
  if (isOnboardingComplete && profile.merchant_status !== 'active') {
    await supabaseClient
      .from('pg_profiles')
      .update({
        merchant_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    // Log the completion
    await supabaseClient
      .from('pg_merchant_onboarding_logs')
      .insert({
        user_id: user.id,
        event_type: 'onboarding_completed',
        event_data: {
          stripe_account_id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        },
      })
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      account_status: accountStatus,
      merchant_status: isOnboardingComplete ? 'active' : profile.merchant_status,
      onboarding_complete: isOnboardingComplete
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function refreshOnboardingLink(stripe: Stripe, supabaseClient: any, user: any) {
  // Get user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.stripe_connect_account_id) {
    throw new Error('Connect account not found')
  }

  // Create new onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: profile.stripe_connect_account_id,
    refresh_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pg_stripe-connect-onboarding`,
    return_url: `${Deno.env.get('FRONTEND_URL')}/merchant/onboarding/complete`,
    type: 'account_onboarding',
  })

  // Update profile with new onboarding URL
  const { error: updateError } = await supabaseClient
    .from('pg_profiles')
    .update({
      onboarding_url: accountLink.url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Database error: ${updateError.message}`)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      onboarding_url: accountLink.url,
      expires_at: accountLink.expires_at
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function handleOnboardingReturn(stripe: Stripe, supabaseClient: any, user: any) {
  // This function handles the return from Stripe onboarding
  // It checks the account status and updates the merchant status accordingly
  
  const { data: profile, error: profileError } = await supabaseClient
    .from('pg_profiles')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.stripe_connect_account_id) {
    throw new Error('Connect account not found')
  }

  // Get fresh account status
  const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)
  
  let newStatus = 'onboarding_started'
  if (account.details_submitted) {
    newStatus = account.charges_enabled && account.payouts_enabled 
      ? 'active' 
      : 'onboarding_completed'
  }

  // Update merchant status
  await supabaseClient
    .from('pg_profiles')
    .update({
      merchant_status: newStatus,
      onboarding_url: null, // Clear the onboarding URL
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  // Log the return event
  await supabaseClient
    .from('pg_merchant_onboarding_logs')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_return',
      event_data: {
        stripe_account_id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        new_status: newStatus,
      },
    })

  return new Response(
    JSON.stringify({ 
      success: true, 
      merchant_status: newStatus,
      account_ready: newStatus === 'active',
      message: newStatus === 'active' 
        ? 'Congratulations! Your merchant account is now active.'
        : 'Onboarding submitted. We\'ll notify you when your account is approved.'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}
