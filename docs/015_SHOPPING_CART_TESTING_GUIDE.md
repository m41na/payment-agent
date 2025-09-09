# Shopping Cart & Checkout System Testing Guide

## Overview

This guide provides comprehensive testing procedures for the shopping cart and checkout system implementation. The system includes cart management, payment integration, real-time updates, and seller transaction tracking.

## Prerequisites

### Environment Setup
- Supabase project configured with all required tables
- Stripe account with publishable and secret keys
- React Native development environment
- Test payment methods configured in Stripe

### Required Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Database Tables Required
- `pg_cart_items` - Cart item storage
- `pg_orders` - Order records
- `pg_order_items` - Order line items
- `pg_products` - Product catalog
- `pg_profiles` - User profiles

## Testing Scenarios

### 1. Cart Management Testing

#### Test Case 1.1: Add Items to Cart
**Objective**: Verify items can be added to cart successfully

**Steps**:
1. Navigate to Discover tab
2. Find a product and tap "Add to Cart"
3. Verify cart badge updates with item count
4. Navigate to Cart tab
5. Verify item appears in cart with correct details

**Expected Results**:
- Cart badge shows correct item count
- Item appears in cart with product name, price, quantity
- Cart total updates correctly
- Items grouped by merchant

#### Test Case 1.2: Update Cart Item Quantities
**Objective**: Verify cart item quantities can be modified

**Steps**:
1. Navigate to Cart tab with items
2. Use quantity controls to increase/decrease item quantity
3. Verify total price updates
4. Test edge cases (quantity = 0, maximum quantity)

**Expected Results**:
- Quantity updates immediately
- Total price recalculates correctly
- Item removed when quantity reaches 0
- Proper validation for maximum quantities

#### Test Case 1.3: Remove Items from Cart
**Objective**: Verify items can be removed from cart

**Steps**:
1. Navigate to Cart tab with items
2. Tap remove button on cart item
3. Confirm removal in alert dialog
4. Verify item disappears from cart

**Expected Results**:
- Confirmation alert appears
- Item removed after confirmation
- Cart total updates correctly
- Cart badge updates

#### Test Case 1.4: Clear Entire Cart
**Objective**: Verify entire cart can be cleared

**Steps**:
1. Navigate to Cart tab with multiple items
2. Tap "Clear Cart" button
3. Confirm action in alert dialog
4. Verify all items removed

**Expected Results**:
- Confirmation alert appears
- All items removed after confirmation
- Cart shows empty state
- Cart badge shows 0 or disappears

### 2. Checkout Flow Testing

#### Test Case 2.1: Express Checkout
**Objective**: Verify express checkout with default payment method

**Prerequisites**: User must have at least one saved payment method

**Steps**:
1. Add items to cart
2. Navigate to Cart tab
3. Tap "Express Checkout" button
4. Verify payment processing
5. Check for success notification

**Expected Results**:
- Payment processes automatically with default method
- Order created successfully
- Ka-ching notification appears
- Cart cleared after successful payment
- Order appears in order history

#### Test Case 2.2: One-Time Payment Checkout
**Objective**: Verify checkout with new payment method

**Steps**:
1. Add items to cart
2. Navigate to Cart tab
3. Tap "Checkout" button
4. Complete payment sheet with test card
5. Verify payment processing

**Expected Results**:
- Payment sheet appears
- Test payment processes successfully
- Order created
- Ka-ching notification appears
- Cart cleared after payment

#### Test Case 2.3: Checkout with Saved Payment Method
**Objective**: Verify checkout with selected saved payment method

**Prerequisites**: User must have multiple saved payment methods

**Steps**:
1. Add items to cart
2. Navigate to Cart tab
3. Select specific payment method
4. Complete checkout
5. Verify correct payment method used

**Expected Results**:
- Payment method selection works
- Correct payment method charged
- Order created successfully
- Transaction recorded correctly

### 3. Real-Time Updates Testing

#### Test Case 3.1: Order Status Updates
**Objective**: Verify real-time order status updates

**Steps**:
1. Complete a checkout to create an order
2. Manually update order status in Supabase dashboard
3. Verify app receives real-time update
4. Check notification appears

**Expected Results**:
- App receives real-time update
- Order status updates in UI
- Appropriate notification shown
- No app refresh required

#### Test Case 3.2: Payment Status Updates
**Objective**: Verify real-time payment status updates

**Steps**:
1. Create order with pending payment
2. Update payment status in Supabase
3. Verify real-time update received
4. Check for ka-ching notification

**Expected Results**:
- Payment status updates in real-time
- Ka-ching notification for successful payments
- UI reflects new payment status
- Seller receives transaction notification

### 4. Seller Transaction Testing

#### Test Case 4.1: Seller Transaction Creation
**Objective**: Verify seller transactions created on order completion

**Steps**:
1. Create products as seller user
2. Switch to buyer account
3. Purchase seller's products
4. Switch back to seller account
5. Check transaction history

**Expected Results**:
- Transaction appears in seller history
- Correct amounts calculated (gross, commission, net)
- Transaction status reflects order/payment status
- Real-time notification received

#### Test Case 4.2: Commission Calculation
**Objective**: Verify commission calculations are correct

**Steps**:
1. Create order with known amounts
2. Complete payment
3. Check seller transaction details
4. Verify commission calculation (5%)

**Expected Results**:
- Gross amount matches order total
- Commission calculated at 5%
- Net amount = gross - commission
- All amounts displayed correctly

#### Test Case 4.3: Multi-Merchant Orders
**Objective**: Verify transactions for multi-merchant orders

**Steps**:
1. Add products from multiple sellers to cart
2. Complete checkout
3. Verify separate transactions created for each seller
4. Check commission calculations per seller

**Expected Results**:
- Separate transactions for each seller
- Correct amounts per seller
- Individual commission calculations
- All sellers receive notifications

### 5. Cart Persistence Testing

#### Test Case 5.1: Session Persistence
**Objective**: Verify cart persists between app sessions

**Steps**:
1. Add items to cart
2. Close app completely
3. Reopen app and navigate to cart
4. Verify items still present

**Expected Results**:
- Cart items persist after app restart
- Quantities and selections maintained
- Cart total correct
- No data loss

#### Test Case 5.2: Cache Expiration
**Objective**: Verify cart cache expires after 24 hours

**Steps**:
1. Add items to cart
2. Manually set cache timestamp to >24 hours ago
3. Restart app
4. Verify cart cleared due to expiration

**Expected Results**:
- Expired cart cleared automatically
- Fresh cart state loaded from server
- No stale data displayed

### 6. Error Handling Testing

#### Test Case 6.1: Network Failure Handling
**Objective**: Verify graceful handling of network failures

**Steps**:
1. Disable network connection
2. Attempt cart operations
3. Re-enable network
4. Verify recovery

**Expected Results**:
- Appropriate error messages shown
- Operations retry when network restored
- No data corruption
- User informed of network issues

#### Test Case 6.2: Payment Failure Handling
**Objective**: Verify handling of failed payments

**Steps**:
1. Add items to cart
2. Attempt checkout with declined test card
3. Verify error handling
4. Retry with valid payment method

**Expected Results**:
- Payment failure handled gracefully
- Clear error message displayed
- Cart remains intact after failure
- User can retry payment

#### Test Case 6.3: Insufficient Inventory
**Objective**: Verify handling when product inventory insufficient

**Steps**:
1. Add item to cart
2. Reduce product inventory below cart quantity
3. Attempt checkout
4. Verify error handling

**Expected Results**:
- Inventory check performed at checkout
- Clear error message about insufficient stock
- User prompted to adjust quantity
- Checkout blocked until resolved

## Performance Testing

### Load Testing
- Test with large cart (50+ items)
- Test with multiple concurrent users
- Verify real-time updates under load
- Monitor memory usage and performance

### Stress Testing
- Rapid cart operations (add/remove/update)
- Multiple simultaneous checkouts
- High-frequency real-time updates
- Database connection limits

## Security Testing

### Authentication Testing
- Verify cart operations require authentication
- Test cart isolation between users
- Verify payment method security
- Test order access controls

### Data Validation
- Test input validation for cart items
- Verify price tampering protection
- Test SQL injection prevention
- Verify XSS protection

## Automated Testing

### Unit Tests
```typescript
// Example test structure
describe('useCart Hook', () => {
  it('should add item to cart', async () => {
    // Test implementation
  });
  
  it('should update cart item quantity', async () => {
    // Test implementation
  });
  
  it('should remove item from cart', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('Checkout Flow', () => {
  it('should complete express checkout', async () => {
    // Test implementation
  });
  
  it('should handle payment failures', async () => {
    // Test implementation
  });
});
```

## Test Data

### Test Products
```json
[
  {
    "id": "test-product-1",
    "name": "Test Coffee Beans",
    "price": 24.99,
    "seller_id": "test-seller-1",
    "inventory": 100
  },
  {
    "id": "test-product-2", 
    "name": "Test Chocolate",
    "price": 12.50,
    "seller_id": "test-seller-2",
    "inventory": 50
  }
]
```

### Test Payment Methods
- Stripe test cards for various scenarios
- Visa: 4242424242424242
- Visa (declined): 4000000000000002
- Mastercard: 5555555555554444

## Monitoring and Analytics

### Key Metrics to Track
- Cart abandonment rate
- Checkout completion rate
- Average order value
- Payment success rate
- Real-time update latency
- Error rates by operation

### Logging
- Cart operations (add, update, remove)
- Checkout attempts and results
- Payment processing events
- Real-time update events
- Error occurrences

## Troubleshooting

### Common Issues
1. **Cart not loading**: Check authentication and database connection
2. **Payment failures**: Verify Stripe configuration and test cards
3. **Real-time updates not working**: Check Supabase realtime configuration
4. **Ka-ching notifications not appearing**: Verify event listeners and permissions

### Debug Tools
- React Native Debugger for state inspection
- Supabase dashboard for database queries
- Stripe dashboard for payment monitoring
- Network inspector for API calls

## Conclusion

This testing guide covers all major aspects of the shopping cart and checkout system. Regular execution of these test cases ensures system reliability, security, and performance. Update this guide as new features are added or requirements change.
