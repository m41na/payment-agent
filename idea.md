## I'd like to create a react native expo checkout app that will facilitate the following use-cases:

1. user profile management through a local docker based supabase container - should user profile table be triggered by account creation (user sign up) or by creation of customer stripe account (new stripe customer)? Advice here please
2. take advantage of supabase functionality available wherever applicable, to drive the application - database, object storage, realtime, vault, rest api, oauth. Use RLS for all database tables and always create access policies around database operations
3. create Stripe customer profile for payment processing. Make sure that all integration with Stripe is done striclty using Stripe components libraries to remain in compliance at all times
4. manage my saved payment methods - create, update, delete, set default
5. express checkout - make a payment without bringing up the checkout form, and instead, use the default saved payment method. This option is of course only available when the user has existing saved payment methods
6. checkout using one of their existing saved payment methods by selecting the payment method to use. This option is once again  only available to a customer who has existing saved payment methods
7. checkout but do not save payment method used. A use case is when someone is using an employer credit card or a friend's credit card. It's a one-time payment option
For this app, since there is no shopping cart involved, it will expect a payment amount that it should process

## Complete Architecture Plan

### __Phase 1: Project Setup & Infrastructure__

1. __React Native Expo Setup__

   - Initialize Expo project with TypeScript
   - Configure Material UI (React Native Paper for Material Design)
   - Set up navigation structure (React Navigation)
   - Configure environment variables for different stages

2. __Supabase Docker Setup__

   - Docker Compose configuration for local Supabase
   - Database schema design
   - Authentication configuration (email/password + Google OAuth)
   - Row Level Security (RLS) policies

3. __Stripe Integration Setup__

   - Stripe SDK integration
   - Webhook endpoint configuration
   - Environment setup for test/live keys

### __Phase 2: Database Schema Design__

__Core Tables:__

```sql
-- Users table (auto-created by Supabase Auth)
-- Additional user profile data
user_profiles (
  id (references auth.users),
  stripe_customer_id,
  default_payment_method_id,
  user_type (customer/agent/buyer),
  created_at,
  updated_at
)

-- Payment methods (metadata only, actual data in Stripe)
payment_methods (
  id,
  user_id,
  stripe_payment_method_id,
  type (card/bank_account),
  last_four,
  expire_month,
  expire_year,
  brand,
  is_default,
  created_at
)

-- Payment transactions
payments (
  id,
  user_id,
  stripe_payment_intent_id,
  amount,
  currency,
  status,
  payment_method_used,
  created_at
)
```

### __Phase 3: Authentication & User Management__

1. __Supabase Auth Integration__

   - Email/password authentication
   - Google OAuth integration
   - User profile creation trigger (on auth.users insert)
   - Session management

2. __User Profile Management__

   - Profile creation/update screens
   - Lazy Stripe customer creation
   - Profile data synchronization

### __Phase 4: Payment Method Management__

1. __Stripe Setup Methods Integration__

   - Add payment method flow using Stripe's SetupIntent
   - Payment method listing and display
   - Set default payment method
   - Delete payment method functionality

2. __UI Components__

   - Payment method cards with Material Design
   - Add payment method modal
   - Payment method selection interface

### __Phase 5: Checkout Flows__

1. __Express Checkout__

   - One-tap payment with default method
   - Amount input/selection interface
   - Payment confirmation

2. __Select Payment Method Checkout__

   - Payment method selection screen
   - Payment processing with selected method

3. __One-time Payment Checkout__

   - Guest-like checkout flow
   - Stripe Payment Element integration
   - No payment method saving

### __Phase 6: Payment Processing__

1. __Stripe Payment Intents__

   - Server-side payment intent creation
   - Client-side payment confirmation
   - Webhook handling for payment status updates

2. __Amount Handling__

   - Fixed amount configuration
   - External API integration for dynamic amounts
   - User input validation for custom amounts

### __Phase 7: Real-time Features & Polish__

1. __Supabase Realtime__

   - Real-time payment status updates
   - Live payment method synchronization

2. __Error Handling & UX__

   - Comprehensive error handling
   - Loading states and animations
   - Success/failure feedback

### __Key Technical Decisions:__

1. __Architecture Pattern__: Clean Architecture with separation of concerns
2. __State Management__: React Context + Supabase realtime for server state
3. __Security__: All sensitive operations server-side, RLS policies, Stripe compliance
4. __Testing__: Unit tests for business logic, integration tests for payment flows

### __Compliance & Security:__

- Never store sensitive payment data locally
- Use Stripe's secure components exclusively
- Implement proper PCI compliance practices
- Secure API endpoints with Supabase RLS
- Environment-based configuration management

## Revised Architecture - Minimal Tech Stack

__Core Technologies:__

- __React Native Expo__ (TypeScript)
- __React Native Paper__ (Material Design)
- __Supabase Client__ (database, auth, realtime, storage)
- __Stripe React Native SDK__ (payments only)
- __React Context__ (global state management)
- __React Navigation__ (navigation)

__State Management Strategy:__

1. __AuthContext__: User authentication state, profile data
2. __PaymentContext__: Payment methods, Stripe customer data
3. __Supabase Realtime__: Live updates for payment methods and transaction status
4. __Local useState__: Component-level state only

__Key Benefits of This Approach:__

- __Minimal Dependencies__: Only essential libraries
- __Direct Control__: No abstraction layers hiding functionality
- __Real-time by Default__: Supabase realtime handles live updates naturally
- __Predictable State Flow__: Clear data flow through contexts
- __Easy Debugging__: Fewer layers to troubleshoot

__Context Structure:__

```typescript
// AuthContext: User session, profile, Stripe customer
// PaymentContext: Payment methods, default method, transactions
// Both contexts subscribe to Supabase realtime channels
```

__Data Flow:__

1. User actions → Context actions
2. Context actions → Supabase API calls
3. Supabase realtime → Context updates
4. Context updates → UI re-renders

This gives you complete control over your data flow while leveraging Supabase's powerful real-time capabilities. No unnecessary abstractions, just clean, predictable state management.
