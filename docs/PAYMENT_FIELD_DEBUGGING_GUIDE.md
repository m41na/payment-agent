# Payment Field Debugging Guide

## Critical Field Configurations That Caused Hours of Debugging

This document captures the specific field combinations, parameter values, and configurations that failed during development, and the exact working solutions that were eventually discovered.

## Stripe Payment Intent Creation

### ❌ Failed Configurations

#### 1. Payment Method Types Array Issue
```typescript
// FAILED - Caused "payment_method_types must include card" error
paymentIntentData.payment_method_types = ['card', 'us_bank_account']

// FAILED - Empty array caused validation error
paymentIntentData.payment_method_types = []

// FAILED - Missing when using manual confirmation
paymentIntentData.confirmation_method = 'manual'
paymentIntentData.confirm = true
// Missing payment_method_types caused error
```

#### 2. Automatic Payment Methods Conflicts
```typescript
// FAILED - Cannot use both automatic_payment_methods and payment_method_types
paymentIntentData.automatic_payment_methods = { enabled: true }
paymentIntentData.payment_method_types = ['card']
// Error: "Cannot specify both automatic_payment_methods and payment_method_types"
```

#### 3. Confirmation Method Issues
```typescript
// FAILED - Manual confirmation without immediate confirm
paymentIntentData.confirmation_method = 'manual'
// Missing confirm: true caused payment to stay in requires_confirmation state

// FAILED - Automatic confirmation with existing payment method
paymentIntentData.payment_method = 'pm_xxx'
paymentIntentData.confirmation_method = 'automatic'
// Caused double-confirmation attempts
```

### ✅ Working Configurations

#### Express Checkout (Existing Payment Method)
```typescript
const paymentIntentData = {
  amount: amount, // Already in cents
  currency: 'usd',
  customer: customerId,
  payment_method: paymentMethodId, // CRITICAL: Must be valid PM ID
  confirmation_method: 'manual', // CRITICAL: Manual for immediate confirm
  confirm: true, // CRITICAL: Confirm immediately
  payment_method_types: ['card'], // REQUIRED when using manual confirmation
  metadata: {
    supabase_user_id: user.id,
  },
  idempotency_key: idempotencyKey, // CRITICAL: Prevent duplicate charges
}
```

#### One-Time Payment (Payment Sheet)
```typescript
const paymentIntentData = {
  amount: amount,
  currency: 'usd', 
  customer: customerId,
  automatic_payment_methods: {
    enabled: true,
    allow_redirects: 'never' // CRITICAL: Prevents redirect payment methods
  },
  metadata: {
    supabase_user_id: user.id,
  },
  // NO payment_method_types when using automatic_payment_methods
  // NO confirmation_method (defaults to automatic)
}
```

## Setup Intent Configuration

### ❌ Failed Configurations

#### 1. Usage Parameter Issues
```typescript
// FAILED - Wrong usage type
usage: 'on_session' // Caused issues with saved payment methods

// FAILED - Missing usage parameter
// Stripe defaulted to 'on_session' which limited reusability
```

#### 2. Payment Method Types Specification
```typescript
// FAILED - Specifying payment method types on setup intent
payment_method_types: ['card'] // Not needed and caused conflicts
```

### ✅ Working Configuration
```typescript
const setupIntent = await stripe.setupIntents.create({
  customer: customerId, // CRITICAL: Must have valid customer
  usage: 'off_session', // CRITICAL: Allows future payments without user
  metadata: {
    supabase_user_id: user.id, // CRITICAL: For webhook processing
  },
  // NO payment_method_types needed - Stripe handles automatically
})
```

## Database Field Mappings

### ❌ Failed Field Mappings

#### 1. Payment Method Storage
```typescript
// FAILED - Storing sensitive card data
{
  card_number: '4242424242424242', // NEVER store raw card data
  cvv: '123', // NEVER store CVV
  stripe_payment_method_id: 'pm_xxx'
}

// FAILED - Wrong field names from Stripe webhook
{
  last_four: payload.payment_method.card.last4, // Wrong field name
  brand: payload.payment_method.card.brand.toUpperCase(), // Wrong case
}
```

#### 2. Transaction Status Mapping
```typescript
// FAILED - Direct status mapping without validation
status: payload.status // Could be undefined or invalid

// FAILED - Wrong status values
status: 'complete' // Should be 'succeeded'
status: 'processing' // Should be 'pending'
```

### ✅ Working Field Mappings

#### Payment Method from Webhook
```typescript
// From payment_method.attached webhook
const paymentMethodData = {
  user_id: metadata.supabase_user_id, // From metadata
  stripe_payment_method_id: payload.payment_method.id,
  type: payload.payment_method.type, // 'card', 'us_bank_account'
  brand: payload.payment_method.card?.brand || null, // visa, mastercard, etc.
  last4: payload.payment_method.card?.last4 || null, // Last 4 digits only
  exp_month: payload.payment_method.card?.exp_month || null,
  exp_year: payload.payment_method.card?.exp_year || null,
  is_default: false, // Set separately via customer.updated webhook
}
```

#### Transaction from Webhook
```typescript
// From payment_intent.succeeded webhook
const transactionData = {
  user_id: metadata.supabase_user_id,
  stripe_payment_intent_id: payload.id,
  amount: payload.amount, // Already in cents from Stripe
  currency: payload.currency, // 'usd'
  status: payload.status, // 'succeeded', 'pending', 'failed'
  description: payload.description || null,
  // payment_method_id resolved separately from payment_methods table
}
```

## Real-Time Subscription Field Issues

### ❌ Failed Subscription Configurations

#### 1. Filter Syntax Issues
```typescript
// FAILED - Wrong filter syntax
filter: `user_id=eq${user.id}` // Missing dot

// FAILED - Wrong field reference
filter: `id=eq.${user.id}` // Should be user_id not id

// FAILED - Multiple filters wrong syntax
filter: `user_id=eq.${user.id} AND status=eq.succeeded` // AND not supported
```

#### 2. Event Type Issues
```typescript
// FAILED - Wrong event names
event: 'create' // Should be 'INSERT'
event: 'update' // Should be 'UPDATE' 
event: 'delete' // Should be 'DELETE'

// FAILED - Using wildcard incorrectly
event: '*' // Worked but inefficient, better to specify exact events
```

### ✅ Working Subscription Configuration
```typescript
supabase
  .channel(`pg_payment_methods_${user.id}`) // Unique channel per user
  .on(
    'postgres_changes',
    {
      event: 'INSERT', // Exact event name
      schema: 'public',
      table: 'pg_payment_methods',
      filter: `user_id=eq.${user.id}` // Correct filter syntax
    },
    (payload) => {
      // payload.new contains the inserted record
      setPaymentMethods(prev => [payload.new as PaymentMethod, ...prev]);
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIPTION_ERROR') {
      // Fallback to manual refresh
      setTimeout(() => fetchPaymentMethods(), 1000);
    }
  });
```

## Webhook Payload Field Access

### ❌ Failed Payload Access Patterns

#### 1. Wrong Nested Field Access
```typescript
// FAILED - Wrong nesting level
const customerId = payload.customer.id // payload.customer is string, not object
const brand = payload.card.brand // Should be payload.payment_method.card.brand
```

#### 2. Missing Null Checks
```typescript
// FAILED - No null checking
const last4 = payload.payment_method.card.last4 // Crashes if card is null
const userId = payload.metadata.supabase_user_id // Crashes if metadata missing
```

### ✅ Working Payload Access
```typescript
// Safe field access with null checks
const customerId = payload.customer // Already a string ID
const brand = payload.payment_method?.card?.brand || null
const last4 = payload.payment_method?.card?.last4 || null
const userId = payload.metadata?.supabase_user_id

// Validate required fields
if (!userId) {
  throw new Error('Missing supabase_user_id in metadata')
}
```

## Amount Handling Issues

### ❌ Failed Amount Configurations

#### 1. Currency Conversion Issues
```typescript
// FAILED - Double conversion to cents
amount: Math.round(dollarAmount * 100) * 100 // Multiplied twice

// FAILED - Float precision issues  
amount: 19.99 * 100 // Results in 1998.9999999999998

// FAILED - Wrong currency format
currency: 'USD' // Should be lowercase 'usd'
```

### ✅ Working Amount Handling
```typescript
// Client side - convert to cents once
const amountInCents = Math.round(dollarAmount * 100)

// Edge function - use amount as-is (already in cents)
const paymentIntentData = {
  amount: amount, // Don't convert again
  currency: 'usd', // Lowercase
}

// Webhook - amount is already in cents from Stripe
const transactionData = {
  amount: payload.amount, // Use directly
}
```

## Error Messages That Wasted Hours

### Cryptic Stripe Errors and Their Real Causes

1. **"payment_method_types must include card"**
   - Real cause: Using `confirmation_method: 'manual'` without `payment_method_types: ['card']`

2. **"Cannot specify both automatic_payment_methods and payment_method_types"**
   - Real cause: Mixing automatic and manual payment method configurations

3. **"This PaymentIntent's payment_method could not be updated"**
   - Real cause: Trying to update payment method on already confirmed intent

4. **"No such payment_method: pm_xxx"**
   - Real cause: Payment method ID from different Stripe account or deleted

5. **"This customer has no attached payment source"**
   - Real cause: Setup intent succeeded but webhook didn't save payment method to database

## Testing Field Combinations

### Critical Test Cases That Revealed Issues

1. **Express checkout with deleted payment method**
   - Revealed need for payment method validation before processing

2. **One-time payment with $0.49 amount**
   - Revealed Stripe $0.50 minimum amount requirement

3. **Multiple rapid payment attempts**
   - Revealed need for idempotency keys

4. **Payment method addition during active subscription**
   - Revealed real-time subscription state update issues

5. **Webhook processing with missing metadata**
   - Revealed need for robust null checking in webhook handlers
