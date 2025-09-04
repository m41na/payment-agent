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
- **Backend**: Supabase Cloud (Database, Auth, Real-time, Edge Functions)
- **Payments**: Stripe SDK with secure server-side processing via Edge Functions
- **State Management**: React Context with real-time subscriptions
- **UI**: Material Design with React Native Paper

## 📋 Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- Supabase CLI (`npm install -g supabase`)
- Supabase Cloud Account
- Stripe Account (test mode)
- Git

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo>
cd payment-agent
npm install
```

### 2. Supabase Setup

1. Create a new project at [Supabase Cloud](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Install Supabase CLI: `npm install -g supabase`
4. Login to Supabase: `supabase login`
5. Link your project: `supabase link --project-ref <your-project-ref>`

### 3. Database Setup

Run the database schema:

```bash
# Apply database schema
supabase db push

# Or manually run the schema from database/schema.sql in your Supabase SQL editor
```

### 4. Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy

# Or deploy individually
supabase functions deploy pg_create-payment-intent
supabase functions deploy pg_create-setup-intent
supabase functions deploy pg_detach-payment-method
supabase functions deploy pg_stripe-webhook
```

### 5. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Update `.env` with your Supabase and Stripe values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret
```

### 6. Configure Stripe Webhooks

1. In your Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/pg_stripe-webhook`
3. Select events: `payment_method.attached`, `payment_method.detached`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the webhook signing secret to your Edge Function secrets:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_your-stripe-secret
```

### 7. Start the App

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run ios
npm run android
```

## 🔧 Edge Functions

The app uses Supabase Edge Functions for secure server-side operations:

### Available Functions

1. **pg_create-payment-intent** - Creates Stripe payment intents
2. **pg_create-setup-intent** - Creates setup intents for saving payment methods
3. **pg_detach-payment-method** - Detaches payment methods from Stripe
4. **pg_stripe-webhook** - Handles Stripe webhook events

### Function Endpoints

All functions are available at: `https://your-project.supabase.co/functions/v1/function-name`

## 📊 Database Schema

### Tables

- **pg_profiles**: User metadata and Stripe customer IDs
- **pg_payment_methods**: Payment method metadata (not sensitive data)
- **pg_transactions**: Transaction history and status

### Key Features

- Automatic profile creation on signup
- Single default payment method enforcement
- Real-time updates via Supabase subscriptions
- Comprehensive indexing for performance
- Row Level Security (RLS) policies

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Test Edge Functions locally
supabase functions serve
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

### Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy with environment variables
supabase secrets set STRIPE_SECRET_KEY=sk_live_your-live-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-live-webhook-secret
```

## 🔧 Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Check your project URL and anon key in `.env`
   - Verify your Supabase project is active

2. **Edge Function Errors**
   - Check function logs: `supabase functions logs function-name`
   - Verify environment secrets are set correctly
   - Ensure functions are deployed: `supabase functions list`

3. **Stripe Payment Fails**
   - Check Edge Function logs for detailed errors
   - Verify Stripe keys are correct and for the right environment
   - Ensure webhook endpoints are configured

4. **Real-time Updates Not Working**
   - Check that realtime is enabled in your Supabase project
   - Verify RLS policies allow subscriptions
   - Check table publications: `SELECT * FROM pg_publication_tables;`

### Debug Mode

Enable debug logging:

```javascript
// Add to App.tsx
if (__DEV__) {
  console.log('Debug mode enabled');
}
```

### Viewing Edge Function Logs

```bash
# View real-time logs
supabase functions logs pg_create-payment-intent --follow

# View specific function logs
supabase functions logs pg_stripe-webhook
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
