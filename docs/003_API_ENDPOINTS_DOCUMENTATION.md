# Payment Agent API Documentation

## Overview

The Payment Agent platform provides RESTful API endpoints for external marketplace integration. This allows third-party applications to leverage our Stripe Connect onboarding platform and payment infrastructure.

## Base URL
```
https://your-domain.com/api/v1
```

## Authentication

All API requests require authentication using API keys:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Core Endpoints

### 1. User Management

#### Create User
```http
POST /users
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "user_type": "customer", // customer, agent, buyer
  "profile": {
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "user_type": "customer",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Get User
```http
GET /users/{user_id}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "user_type": "customer",
  "profile": {
    "full_name": "John Doe",
    "phone": "+1234567890"
  },
  "subscription": {
    "status": "active",
    "plan_id": "monthly",
    "current_period_end": "2024-02-15T10:30:00Z"
  }
}
```

### 2. Subscription Management

#### Get Available Plans
```http
GET /subscriptions/plans
```

**Response:**
```json
{
  "plans": [
    {
      "id": "daily",
      "name": "Daily Access",
      "price": 4.99,
      "interval": "day",
      "stripe_price_id": "price_daily_499"
    },
    {
      "id": "monthly",
      "name": "Monthly",
      "price": 9.99,
      "interval": "month",
      "stripe_price_id": "price_monthly_999"
    },
    {
      "id": "yearly",
      "name": "Annual",
      "price": 99.99,
      "interval": "year",
      "stripe_price_id": "price_yearly_9999"
    }
  ]
}
```

#### Create Subscription
```http
POST /subscriptions
```

**Request Body:**
```json
{
  "user_id": "user_123",
  "plan_id": "monthly",
  "payment_method_id": "pm_1234567890"
}
```

**Response:**
```json
{
  "subscription_id": "sub_123",
  "status": "active",
  "current_period_start": "2024-01-15T10:30:00Z",
  "current_period_end": "2024-02-15T10:30:00Z"
}
```

#### Get User Subscription
```http
GET /users/{user_id}/subscription
```

**Response:**
```json
{
  "id": "sub_123",
  "user_id": "user_123",
  "plan_id": "monthly",
  "status": "active",
  "current_period_start": "2024-01-15T10:30:00Z",
  "current_period_end": "2024-02-15T10:30:00Z",
  "stripe_subscription_id": "sub_stripe_123"
}
```

### 3. Payment Methods

#### List Payment Methods
```http
GET /users/{user_id}/payment-methods
```

**Response:**
```json
{
  "payment_methods": [
    {
      "id": "pm_123",
      "stripe_payment_method_id": "pm_stripe_123",
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025,
      "is_default": true
    }
  ]
}
```

#### Add Payment Method
```http
POST /users/{user_id}/payment-methods
```

**Request Body:**
```json
{
  "stripe_payment_method_id": "pm_stripe_456",
  "set_as_default": false
}
```

### 4. Transactions

#### Create Payment Intent
```http
POST /payments/intents
```

**Request Body:**
```json
{
  "user_id": "user_123",
  "amount": 2500, // Amount in cents
  "currency": "usd",
  "description": "Product purchase",
  "payment_method_id": "pm_stripe_123", // Optional for express checkout
  "metadata": {
    "order_id": "order_456",
    "marketplace_id": "marketplace_789"
  }
}
```

**Response:**
```json
{
  "payment_intent_id": "pi_123",
  "client_secret": "pi_123_secret_456",
  "status": "requires_confirmation"
}
```

#### Get Transaction History
```http
GET /users/{user_id}/transactions
```

**Query Parameters:**
- `limit`: Number of transactions to return (default: 20, max: 100)
- `offset`: Number of transactions to skip
- `status`: Filter by transaction status (completed, pending, failed)
- `from_date`: Start date (ISO 8601)
- `to_date`: End date (ISO 8601)

**Response:**
```json
{
  "transactions": [
    {
      "id": "txn_123",
      "user_id": "user_123",
      "amount": 2500,
      "currency": "usd",
      "status": "completed",
      "description": "Product purchase",
      "created_at": "2024-01-15T10:30:00Z",
      "stripe_payment_intent_id": "pi_stripe_123"
    }
  ],
  "has_more": false,
  "total_count": 1
}
```

### 5. Listings (Proximity-based)

#### Get Nearby Listings
```http
GET /listings/nearby
```

**Query Parameters:**
- `latitude`: User's latitude (required)
- `longitude`: User's longitude (required)
- `radius`: Search radius in miles (default: 10, max: 50)
- `category`: Filter by category
- `search`: Search term for title/description
- `limit`: Number of listings to return (default: 20, max: 100)

**Response:**
```json
{
  "listings": [
    {
      "id": "listing_123",
      "title": "Fresh Coffee Beans",
      "description": "Premium arabica coffee beans",
      "price": 15.99,
      "merchant": {
        "id": "merchant_456",
        "name": "Local Coffee Roasters",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060
        }
      },
      "category": "Food & Beverage",
      "distance": 0.3,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Create Listing (Merchant only)
```http
POST /listings
```

**Request Body:**
```json
{
  "merchant_id": "user_123",
  "title": "Fresh Coffee Beans",
  "description": "Premium arabica coffee beans",
  "price": 15.99,
  "category": "Food & Beverage",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "inventory": 25
}
```

### 6. Merchant Onboarding

#### Get Onboarding Status
```http
GET /merchants/{user_id}/onboarding-status
```

**Response:**
```json
{
  "user_id": "user_123",
  "onboarding_status": "completed", // pending, in_progress, completed
  "stripe_account_id": "acct_stripe_123",
  "requirements": {
    "currently_due": [],
    "eventually_due": [],
    "past_due": []
  },
  "charges_enabled": true,
  "payouts_enabled": true
}
```

#### Create Stripe Connect Account
```http
POST /merchants/{user_id}/stripe-account
```

**Request Body:**
```json
{
  "business_type": "individual", // individual, company
  "country": "US",
  "email": "merchant@example.com"
}
```

## Webhooks

### Webhook Events

The platform sends webhooks for the following events:

- `payment.succeeded` - Payment completed successfully
- `payment.failed` - Payment failed
- `subscription.created` - New subscription created
- `subscription.updated` - Subscription status changed
- `subscription.deleted` - Subscription cancelled
- `merchant.onboarded` - Merchant completed Stripe Connect onboarding

### Webhook Payload Example

```json
{
  "event": "payment.succeeded",
  "data": {
    "payment_intent_id": "pi_123",
    "user_id": "user_123",
    "amount": 2500,
    "currency": "usd",
    "metadata": {
      "order_id": "order_456",
      "marketplace_id": "marketplace_789"
    }
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request parameters are invalid",
    "details": {
      "field": "email",
      "issue": "Email address is already in use"
    }
  }
}
```

### Common Error Codes

- `INVALID_REQUEST` - Request parameters are invalid
- `UNAUTHORIZED` - Invalid or missing API key
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

API requests are limited to:
- 1000 requests per hour for authenticated requests
- 100 requests per hour for unauthenticated requests

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## SDK Examples

### JavaScript/Node.js

```javascript
const PaymentAgent = require('@payment-agent/sdk');

const client = new PaymentAgent({
  apiKey: 'your_api_key',
  baseUrl: 'https://your-domain.com/api/v1'
});

// Create a user
const user = await client.users.create({
  email: 'user@example.com',
  password: 'securepassword',
  user_type: 'customer'
});

// Get nearby listings
const listings = await client.listings.getNearby({
  latitude: 40.7128,
  longitude: -74.0060,
  radius: 5
});
```

### Python

```python
from payment_agent import PaymentAgentClient

client = PaymentAgentClient(
    api_key='your_api_key',
    base_url='https://your-domain.com/api/v1'
)

# Create a payment intent
payment_intent = client.payments.create_intent(
    user_id='user_123',
    amount=2500,
    currency='usd',
    description='Product purchase'
)
```

## Testing

### Test Environment

Use the test base URL for development:
```
https://test.your-domain.com/api/v1
```

### Test API Keys

Test API keys are prefixed with `test_`:
```
test_pk_1234567890abcdef
```

### Test Data

The test environment includes sample users, listings, and transactions for integration testing.
