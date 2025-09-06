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

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // Handle redirect URLs (no auth required)
    if (action === 'test') {
      return new Response('<h1>Test HTML</h1><p>This is a test.</p>', {
        status: 200,
        headers: { 
          'Content-Type': 'text/html'
        }
      });
    }

    if (action === 'handle_onboarding_return') {
      console.log('Handling onboarding return redirect');
      
      try {
        // Extract account ID from query parameters or session
        const accountId = url.searchParams.get('account_id');
        if (!accountId) {
          throw new Error('Missing account ID in return URL');
        }

        // Fetch the latest account status from Stripe
        const account = await stripe.accounts.retrieve(accountId);
        
        console.log('Onboarding completion check:', {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          currently_due_count: account.requirements?.currently_due?.length || 0,
          currently_due: account.requirements?.currently_due,
        });

        // Determine appropriate onboarding status
        let onboarding_status = 'pending';
        if (account.charges_enabled && account.payouts_enabled) {
          onboarding_status = 'completed';
        } else if (account.requirements?.currently_due?.length > 0 || account.requirements?.past_due?.length > 0) {
          onboarding_status = 'in_progress';
        }

        // Update our database with the latest account information
        const { error: updateError } = await supabaseClient
          .from('pg_stripe_connect_accounts')
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            requirements: account.requirements,
            onboarding_status: onboarding_status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', accountId);

        if (updateError) {
          console.error('Error updating account status:', updateError);
          throw updateError;
        }

        // Determine onboarding completion status
        const isOnboardingComplete = account.charges_enabled && 
                                    account.payouts_enabled &&
                                    (!account.requirements?.currently_due || account.requirements.currently_due.length === 0);

        console.log('Onboarding status updated:', { accountId, isOnboardingComplete });

        // Return JSON response since Supabase blocks HTML anyway
        return new Response(JSON.stringify({
          success: true,
          message: 'Onboarding status updated successfully',
          account_id: accountId,
          onboarding_complete: isOnboardingComplete,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });

      } catch (error) {
        console.error('Error processing onboarding return:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message || 'Failed to process onboarding return',
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    }
    
    if (action === 'refresh_onboarding_link') {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refreshing Onboarding</title>
  <meta http-equiv="refresh" content="3;url=paymentagent://merchant/onboarding/refresh">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; background: #f8f9fa;">
  <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
    <h1 style="color: #333; margin-bottom: 20px;">Refreshing Onboarding...</h1>
    <p style="color: #666;">Please wait while we refresh your onboarding session.</p>
    <p style="color: #999; font-size: 14px; margin-top: 20px;">You will be redirected automatically in 3 seconds.</p>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</body>
</html>`;

      return new Response(htmlContent, {
        status: 200,
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'none'; object-src 'none';",
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabaseClient.auth.getUser(token)
    const user = data.user

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    switch (action) {
      case 'create_connect_account':
        return await createConnectAccount(stripe, supabaseClient, user)
      case 'create_onboarding_link':
        return await createOnboardingLink(stripe, supabaseClient, user, {
          return_url: url.searchParams.get('return_url'),
          refresh_url: url.searchParams.get('refresh_url')
        })
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

  // Check if merchant account already exists
  const { data: existingMerchant, error: merchantError } = await supabaseClient
    .from('pg_stripe_connect_accounts')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (merchantError && merchantError.code !== 'PGRST116') {
    console.error('Error checking existing merchant account:', merchantError)
    throw new Error('Error checking merchant account status')
  }

  if (existingMerchant) {
    throw new Error('Merchant account already exists')
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

  // Create merchant account record
  const { data: merchantAccount, error: insertError } = await supabaseClient
    .from('pg_stripe_connect_accounts')
    .insert({
      user_id: user.id,
      stripe_account_id: account.id,
      onboarding_status: 'pending',
      charges_enabled: false,
      payouts_enabled: false,
      requirements: {
        currently_due: [],
        eventually_due: [],
        past_due: [],
      },
    })
    .select()
    .single()

  if (insertError) {
    // Cleanup: delete the Stripe account if database insert fails
    await stripe.accounts.del(account.id)
    throw new Error(`Database error: ${insertError.message}`)
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
      merchant_account_id: merchantAccount.id,
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
  accountData: { return_url?: string; refresh_url?: string }
) {
  // Get merchant account
  const { data: merchantAccount, error: merchantError } = await supabaseClient
    .from('pg_stripe_connect_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (merchantError || !merchantAccount) {
    throw new Error('Merchant account not found')
  }

  // Create onboarding link with account_id in URLs
  const accountLink = await stripe.accountLinks.create({
    account: merchantAccount.stripe_account_id,
    refresh_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pg_stripe-connect-onboarding?action=refresh_onboarding_link&account_id=${merchantAccount.stripe_account_id}`,
    return_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pg_stripe-connect-onboarding?action=handle_onboarding_return&account_id=${merchantAccount.stripe_account_id}`,
    type: 'account_onboarding',
  })

  // Log the event
  await supabaseClient
    .from('pg_merchant_onboarding_logs')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_link_created',
      event_data: {
        stripe_account_id: merchantAccount.stripe_account_id,
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
  // Get merchant account
  const { data: merchantAccount, error: merchantError } = await supabaseClient
    .from('pg_stripe_connect_accounts')
    .select('stripe_account_id, onboarding_status, charges_enabled, payouts_enabled, requirements')
    .eq('user_id', user.id)
    .single()

  if (merchantError || !merchantAccount) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        account_status: 'not_created',
        merchant_status: 'none'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  // Get account details from Stripe
  const account = await stripe.accounts.retrieve(merchantAccount.stripe_account_id)

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
  const isOnboardingComplete = account.charges_enabled && 
                              account.payouts_enabled

  // Update merchant status if onboarding is complete
  if (isOnboardingComplete && merchantAccount.onboarding_status !== 'active') {
    await supabaseClient
      .from('pg_stripe_connect_accounts')
      .update({
        onboarding_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

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
      merchant_status: isOnboardingComplete ? 'active' : merchantAccount.onboarding_status,
      onboarding_complete: isOnboardingComplete
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

async function refreshOnboardingLink(stripe: Stripe, supabaseClient: any, user: any) {
  // Get merchant account
  const { data: merchantAccount, error: merchantError } = await supabaseClient
    .from('pg_stripe_connect_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (merchantError || !merchantAccount) {
    throw new Error('Merchant account not found')
  }

  // Create new onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: merchantAccount.stripe_account_id,
    refresh_url: 'https://your-app-domain.com/merchant/onboarding/refresh',
    return_url: 'https://your-app-domain.com/merchant/onboarding/complete',
    type: 'account_onboarding',
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

async function handleOnboardingReturn(stripe: Stripe, supabaseClient: any, user: any) {
  // This function handles the return from Stripe onboarding
  // It checks the account status and updates the merchant status accordingly
  
  // Get merchant account
  const { data: merchantAccount, error: merchantError } = await supabaseClient
    .from('pg_stripe_connect_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single()

  if (merchantError || !merchantAccount) {
    throw new Error('Merchant account not found')
  }

  // Get fresh account status
  const account = await stripe.accounts.retrieve(merchantAccount.stripe_account_id)
  
  let newStatus = 'onboarding_started'
  if (account.charges_enabled && account.payouts_enabled) {
    newStatus = 'active'
  }

  // Update merchant status
  await supabaseClient
    .from('pg_stripe_connect_accounts')
    .update({
      onboarding_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  // Log the return event
  await supabaseClient
    .from('pg_merchant_onboarding_logs')
    .insert({
      user_id: user.id,
      event_type: 'onboarding_return',
      event_data: {
        stripe_account_id: account.id,
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
