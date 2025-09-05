# Payment Processing Architecture

## Core Principle: Product vs Payment Method Separation

The payment system is built on a fundamental principle of **complete separation** between products and payment methods.

### Products
- **Purpose**: Purely a price point to determine the amount to charge
- **Role**: Provides `price_amount`, `stripe_price_id`, and metadata
- **Independence**: Product characteristics (daily, monthly, yearly, etc.) have NO impact on payment processing flow

### Payment Methods
- **Purpose**: Defines HOW the payment is executed
- **Types**:
  - `one-time`: New card entry, not saved after payment
  - `saved`: Previously saved card selected by user
  - `express`: Default saved card used automatically
- **Independence**: Payment method choice is completely independent of product type

## Universal Payment Processing

**ANY product can be purchased with ANY payment method:**

```
Daily Plan + One-Time Payment ✓
Daily Plan + Saved Payment ✓
Daily Plan + Express Payment ✓

Monthly Plan + One-Time Payment ✓
Monthly Plan + Saved Payment ✓
Monthly Plan + Express Payment ✓

Yearly Plan + One-Time Payment ✓
Yearly Plan + Saved Payment ✓
Yearly Plan + Express Payment ✓
```

## Routing Logic

The system routes based on `payment_option` ONLY:

```typescript
if (subscriptionData.payment_option === 'one-time') {
  // PaymentIntent flow - works for ANY product
  return createOneTimePayment(...)
}

// Subscription flow - works for ANY product
return createSubscription(...)
```

## Anti-Pattern: Product-Based Routing

❌ **WRONG**: Routing based on product characteristics
```typescript
if (plan.billing_interval === 'one_time') {
  // This ties payment method to product type
}
```

✅ **CORRECT**: Routing based on payment method choice
```typescript
if (subscriptionData.payment_option === 'one-time') {
  // This separates payment method from product
}
```

## Key Insights

1. **Products are price containers** - they exist solely to provide charge amounts
2. **Payment methods are execution strategies** - they define how to process the charge
3. **Complete orthogonality** - these concepts are entirely independent
4. **Universal compatibility** - any product works with any payment method
5. **User choice drives routing** - payment flow is determined by user's payment method selection, not product characteristics

This architecture enables truly product-agnostic payment processing where the payment system can handle any type of product or service without modification.
