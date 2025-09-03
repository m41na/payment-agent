# Payment Agent - React Native Expo App

A secure, production-ready React Native payment processing app built with Expo, Supabase, and Stripe. Features user authentication, payment method management, and three distinct checkout flows.

## 🚀 Features

- **User Authentication**: Email/password with automatic profile creation
- **Payment Method Management**: Add, delete, and set default payment methods
- **Three Checkout Flows**:
  - **Express Checkout**: One-tap payment with default method
  - **Selective Checkout**: Choose from saved payment methods
  - **One-Time Checkout**: Guest-like payment without saving method
- **Real-time Updates**: Live payment status and method synchronization
- **Security First**: Row Level Security (RLS), Stripe compliance, secure storage

## 🏗️ Architecture

- **Frontend**: React Native Expo with TypeScript
- **Backend**: Supabase (Database, Auth, Real-time, Storage)
- **Payments**: Stripe SDK with secure server-side processing
- **State Management**: React Context with real-time subscriptions
- **UI**: Material Design with React Native Paper

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Expo CLI (`npm install -g @expo/cli`)
- Stripe Account (test mode)
- Git

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo>
cd payment-agent
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Update `.env` with your values:
- Generate secure passwords and JWT secrets
- Add your Stripe publishable key to `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 3. Start Supabase Services

```bash
# Start all Supabase services
docker-compose up -d

# Check services are running
docker-compose ps
```

**Supabase will be available at:**
- Studio: http://localhost:54323
- API: http://localhost:54321
- Database: localhost:5432

### 4. Configure Stripe

1. Get your Stripe keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Update `.env` with your publishable key
3. Set up webhook endpoints (see Backend Setup section)

### 5. Start the App

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run ios
npm run android
```

## 🔧 Backend API Setup

You'll need to create a backend API to handle Stripe operations securely. Here are the required endpoints:

### Required Endpoints

1. **POST /create-customer** - Create Stripe customer
2. **POST /create-setup-intent** - Setup payment methods
3. **POST /create-payment-intent** - Process payments
4. **POST /detach-payment-method** - Remove payment methods
5. **POST /sync-payment-methods** - Sync with Stripe
6. **POST /webhook** - Handle Stripe webhooks

### Example Backend Structure (Node.js/Express)

```javascript
// Example endpoint structure
app.post('/create-customer', authenticateUser, async (req, res) => {
  const { email, name } = req.body;
  const customer = await stripe.customers.create({ email, name });
  res.json({ customer_id: customer.id });
});

app.post('/create-payment-intent', authenticateUser, async (req, res) => {
  const { amount, currency, customer_id, payment_method_id } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customer_id,
    payment_method: payment_method_id,
    confirmation_method: 'manual',
    confirm: true,
  });
  res.json({ 
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id 
  });
});
```

## 📱 Usage Guide

### User Registration & Authentication

1. Open the app
2. Tap "Sign Up" and enter email/password
3. Choose user type (customer/agent/buyer)
4. Profile is automatically created

### Adding Payment Methods

1. Navigate to "Payment Methods"
2. Tap "Add Payment Method"
3. Enter card details in Stripe's secure form
4. Method is saved and can be set as default

### Making Payments

**Express Checkout:**
- Enter amount on home screen
- Tap "Pay Now" - uses default payment method

**Selective Checkout:**
- Choose "Select Payment Method"
- Pick from saved methods
- Confirm payment

**One-Time Checkout:**
- Choose "One-Time Payment"
- Enter new card details
- Payment processed without saving

## 🔒 Security Features

- **Row Level Security**: Database access restricted to user's own data
- **Secure Storage**: Sensitive tokens stored in Expo SecureStore
- **Stripe Compliance**: All payment data handled by Stripe's secure components
- **JWT Authentication**: Supabase handles secure session management
- **Environment Variables**: Sensitive keys never hardcoded

## 📊 Database Schema

### Tables

- **user_profiles**: User metadata and Stripe customer IDs
- **payment_methods**: Payment method metadata (not sensitive data)
- **payments**: Transaction history and status

### Key Features

- Automatic profile creation on signup
- Single default payment method enforcement
- Real-time updates via Supabase subscriptions
- Comprehensive indexing for performance

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

### Test Cards (Stripe Test Mode)

- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Requires 3DS**: 4000002500003155

## 🚀 Deployment

### Mobile App Deployment

```bash
# Build for production
expo build:android
expo build:ios

# Or use EAS Build
eas build --platform all
```

### Backend Deployment

Deploy your backend API to:
- Vercel/Netlify (serverless)
- Railway/Render (containers)
- AWS/GCP/Azure (cloud platforms)

## 🔧 Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Check Docker services: `docker-compose ps`
   - Verify environment variables in `.env`

2. **Stripe Payment Fails**
   - Ensure backend API is running
   - Check Stripe keys are correct
   - Verify webhook endpoints

3. **Real-time Updates Not Working**
   - Check Supabase realtime is enabled
   - Verify RLS policies allow subscriptions

### Debug Mode

Enable debug logging:

```javascript
// Add to App.tsx
if (__DEV__) {
  console.log('Debug mode enabled');
}
```

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe React Native SDK](https://stripe.com/docs/stripe-js/react-native)
- [React Native Paper](https://reactnativepaper.com/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using React Native, Supabase, and Stripe**
