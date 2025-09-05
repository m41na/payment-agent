# Stripe Product Synchronization System

## Overview

The Stripe Product Sync system automatically synchronizes Stripe products and prices to your local database, allowing the app to dynamically discover and display merchant plans without hardcoding them in the frontend.

## Architecture

### Components

1. **`pg_merchant_plans` Table** - Local database table storing synced Stripe product/price data
2. **`pg_sync-stripe-products` Edge Function** - Manual sync function to pull all Stripe products/prices
3. **`pg_stripe-webhook` Edge Function** - Automatic sync via Stripe webhooks for real-time updates

### Data Flow

```
Stripe Dashboard → Webhook Events → pg_stripe-webhook → pg_merchant_plans Table → App UI
                ↗ Manual Sync ↗ pg_sync-stripe-products ↗
```

## Database Schema

The `pg_merchant_plans` table stores:

```sql
- id (UUID, primary key)
- name (TEXT) - Product name from Stripe
- description (TEXT) - Product description from Stripe  
- stripe_product_id (TEXT) - Stripe product ID
- stripe_price_id (TEXT, unique) - Stripe price ID
- amount (INTEGER) - Price amount in cents
- currency (TEXT) - Price currency (e.g., 'usd')
- billing_interval (TEXT) - 'month', 'year', or 'one_time'
- is_active (BOOLEAN) - App-level toggle for plan visibility
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## Setup Instructions

### 1. Deploy Database Migration

Run migration 008 to rename the table and update schema:

```bash
# Apply the migration to your Supabase database
supabase db push
```

### 2. Deploy Edge Functions

Deploy both edge functions:

```bash
# Deploy sync function
supabase functions deploy pg_sync-stripe-products

# Deploy webhook function  
supabase functions deploy pg_stripe-webhook
```

### 3. Configure Stripe Webhook

1. Go to your Stripe Dashboard → Webhooks
2. Create a new webhook endpoint pointing to:
   ```
   https://your-project.supabase.co/functions/v1/pg_stripe-webhook
   ```
3. Add these event types:
   - `product.created`
   - `product.updated` 
   - `product.deleted`
   - `price.created`
   - `price.updated`
   - `price.deleted`

4. Copy the webhook signing secret and add to your environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

### 4. Initial Sync

Perform initial sync of existing Stripe products:

```bash
# Call the sync function to pull existing products
curl -X POST https://your-project.supabase.co/functions/v1/pg_sync-stripe-products \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Testing the Feature

### Prerequisites
- Existing Stripe products with prices in your Stripe dashboard
- Database migration 008 applied
- Edge functions deployed
- Webhook configured (optional for initial testing)

### Step 1: Initial Sync
Call the sync function to pull your existing Stripe products:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/pg_sync-stripe-products \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Step 2: Verify Database
Check that products were synced to your database:

```sql
SELECT * FROM pg_merchant_plans ORDER BY created_at DESC;
```

You should see your Stripe products with:
- Product names and descriptions
- Stripe product/price IDs
- Correct amounts and billing intervals
- `is_active = true` for active Stripe products

### Step 3: Test App Integration
Your app should now dynamically load these plans in the StorefrontScreen subscription modal.

### Step 4: Test Real-time Sync (Optional)
1. Create a new product in Stripe Dashboard
2. Add a price to the product
3. Check your database - the new plan should appear automatically via webhook

## Usage

### App-Level Plan Control
Toggle plan visibility in your app without affecting Stripe:

```sql
-- Hide a plan from the app (but keep active in Stripe)
UPDATE pg_merchant_plans 
SET is_active = false 
WHERE stripe_price_id = 'price_xyz';

-- Show a plan in the app
UPDATE pg_merchant_plans 
SET is_active = true 
WHERE stripe_price_id = 'price_xyz';
```

### Frontend Integration
Plans are automatically loaded in `SubscriptionContext`:

```typescript
// Plans are fetched from pg_merchant_plans table
const { subscriptionPlans } = useSubscription();

// Plans include all synced Stripe data
subscriptionPlans.forEach(plan => {
  console.log(plan.name, plan.amount, plan.billing_interval);
});
```

## Benefits

1. **Dynamic Plan Management** - Add/modify plans in Stripe Dashboard, they appear in app automatically
2. **No Hardcoded Data** - All plan information comes from Stripe, ensuring consistency
3. **App-Level Control** - Toggle plan visibility without affecting Stripe configuration
4. **Real-time Sync** - Webhook keeps database in sync with Stripe changes
5. **Rollback Safety** - Can deactivate plans in app while keeping them in Stripe

## Troubleshooting

### Sync Function Issues
- Check Stripe API key is set correctly
- Verify products have at least one price in Stripe
- Check function logs for detailed error messages

### Webhook Issues  
- Verify webhook endpoint URL is correct
- Check webhook signing secret matches environment variable
- Ensure webhook events are configured correctly in Stripe Dashboard

### Database Issues
- Confirm migration 008 was applied successfully
- Check RLS policies allow reading from `pg_merchant_plans`
- Verify unique constraint on `stripe_price_id` exists

## Security Notes

- Webhook endpoint verifies Stripe signature for authenticity
- Database uses RLS policies to control access
- Sync function requires proper authentication
- Sensitive Stripe data is not stored (only product/price metadata)
