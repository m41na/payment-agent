# Payment Methods Implementation Guide

## Overview

This payment agent implements 4 distinct payment flows, each with specific use cases and technical requirements. All methods integrate with Stripe and use Supabase for data persistence and real-time updates.

## Database Schema (Remote Supabase)

**Critical:** Remote database uses `pg_*` prefixed tables:
- `pg_profiles` - User profiles with Stripe customer IDs
- `pg_payment_methods` - Saved payment methods
- `pg_transactions` - Transaction history

## Payment Methods

### 1. Express Checkout
**Use Case:** Fastest payment using user's default payment method

**Flow:**
1. Finds user's default payment method from `pg_payment_methods`
2. If no default exists, sets first available method as default
3. Calls `processPayment()` with default payment method ID
4. Uses existing payment method - no UI interaction required

**Requirements:**
- User must have at least one saved payment method
- Requires valid Stripe customer ID in `pg_profiles`
- Default payment method must be valid in Stripe

**Edge Function:** `pg_create-payment-intent`
**Key Implementation Detail:** Automatically sets first payment method as default if none exists

### 2. One-Time Payment
**Use Case:** Payment without saving payment method (guest-like experience)

**Flow:**
1. Creates payment intent without `paymentMethodId` parameter
2. Initializes Stripe Payment Sheet with client secret
3. User enters payment details in Payment Sheet UI
4. Stripe processes payment and creates payment method
5. Webhook records transaction in `pg_transactions`

**Requirements:**
- Stripe Payment Sheet must be properly initialized
- Payment Sheet UI handles all payment method collection
- Webhook must be configured to handle `payment_intent.succeeded`

**Edge Function:** `pg_create-payment-intent` (without paymentMethodId)
**Key Implementation Detail:** Payment method is NOT saved to database after payment

### 3. Selective Checkout
**Use Case:** Payment with specific pre-saved payment method

**Flow:**
1. User selects from list of saved payment methods
2. Validates selected method exists in user's `pg_payment_methods`
3. Calls `processPayment()` with specific `paymentMethodId`
4. Processes payment using selected method

**Requirements:**
- User must have multiple saved payment methods
- Selected payment method must be valid in both database and Stripe
- Payment method validation before processing

**Edge Function:** `pg_create-payment-intent`
**Key Implementation Detail:** Validates payment method ownership before processing

### 4. Add Payment Method Flow
**Use Case:** Save payment method for future use

**Flow:**
1. Creates setup intent via `pg_create-setup-intent`
2. User enters payment details (card info)
3. Stripe creates and attaches payment method to customer
4. Webhook saves payment method details to `pg_payment_methods`
5. Real-time subscription updates UI immediately

**Requirements:**
- Valid Stripe customer must exist
- Setup intent must be properly configured
- Webhook must handle `setup_intent.succeeded` and `payment_method.attached`

**Edge Function:** `pg_create-setup-intent`
**Key Implementation Detail:** First payment method is automatically set as default

## Critical Implementation Requirements

### Real-Time Subscriptions
**Tables:** `pg_payment_methods`, `pg_transactions`
**Events:** INSERT, UPDATE, DELETE
**Purpose:** Instant UI updates when webhooks modify data

```typescript
// Channel naming pattern
.channel(`pg_payment_methods_${user.id}`)
.channel(`pg_transactions_${user.id}`)
```

**Fallback:** Automatic retry with `fetchPaymentMethods()` if subscription fails

### Webhook Integration
**Required Webhooks:**
- `payment_intent.succeeded` → Creates transaction record
- `setup_intent.succeeded` → Confirms payment method setup
- `payment_method.attached` → Saves payment method details
- `payment_method.detached` → Removes payment method
- `customer.updated` → Syncs default payment method changes

**Critical:** All database writes happen via webhooks, not client-side

### Error Handling Patterns
1. **Subscription Errors:** Fallback to periodic refresh
2. **Payment Failures:** Clear error state and retry mechanism
3. **Network Issues:** Timeout handling with user feedback
4. **Stripe Errors:** Proper error message extraction and display

### Security Requirements
- Row Level Security (RLS) enabled on all tables
- User ID filtering on all database queries
- Stripe API keys properly secured in Edge Functions
- No sensitive payment data stored in database

## Edge Function Details

### pg_create-payment-intent
**Purpose:** Creates Stripe payment intent for processing payments
**Parameters:**
- `amount` (required)
- `description` (optional)
- `paymentMethodId` (optional - triggers different flows)

**Behavior:**
- Without `paymentMethodId`: Returns client secret for Payment Sheet
- With `paymentMethodId`: Confirms payment immediately
- Automatically creates Stripe customer if none exists

### pg_create-setup-intent
**Purpose:** Creates setup intent for saving payment methods
**Parameters:**
- No additional parameters (uses authenticated user)

**Behavior:**
- Creates/retrieves Stripe customer
- Returns client secret for payment method collection
- Configures automatic payment method attachment

## Common Pitfalls

1. **Table Name Mismatches:** Always use `pg_*` prefixed table names
2. **Missing Customer Creation:** Edge functions must handle customer creation
3. **Webhook Dependencies:** Never write to database from client - always via webhooks
4. **Real-time Channel Conflicts:** Use unique channel names per user
5. **Payment Method Validation:** Always validate ownership before processing
6. **Default Payment Method Logic:** Handle cases where no default exists

## Testing Checklist

- [ ] Express checkout with existing default payment method
- [ ] Express checkout when no default exists (auto-sets first method)
- [ ] One-time payment with new card details
- [ ] Selective checkout with specific saved method
- [ ] Add new payment method and verify real-time UI update
- [ ] Remove payment method and verify real-time UI update
- [ ] Webhook processing for all payment events
- [ ] Error handling for network failures
- [ ] Error handling for invalid payment methods
- [ ] Real-time subscription fallback behavior
