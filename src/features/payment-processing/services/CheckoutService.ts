import { useStripe } from '@stripe/stripe-react-native';
import { PaymentService } from './PaymentService';
import { CheckoutOptions, CheckoutFlow, PaymentResult, PaymentError } from '../types';

// Global guard to ensure only one payment sheet is presented across the app
let globalPaymentSheetInProgress = false;

export class CheckoutService {
  private paymentService: PaymentService;
  private stripe: any;

  constructor(paymentService: PaymentService, stripe: any) {
    this.paymentService = paymentService;
    this.stripe = stripe;
  }

  async processCheckout(flow: CheckoutFlow, options: CheckoutOptions): Promise<PaymentResult> {
    try {
      switch (flow) {
        case 'express':
          return await this.expressCheckout(options);
        case 'selective':
          return await this.selectiveCheckout(options);
        case 'one-time':
          return await this.oneTimeCheckout(options);
        default:
          throw this.createError('Invalid checkout flow', 'validation');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Checkout failed'
      };
    }
  }

  private async expressCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    // Get default payment method
    const defaultMethod = await this.paymentService.getDefaultPaymentMethod();

    if (!defaultMethod) {
      throw this.createError('No default payment method available', 'validation');
    }

    // Create payment intent with default method
    const intent = await this.paymentService.createPaymentIntent({
      ...options,
      paymentMethodId: defaultMethod.stripe_payment_method_id
    });

    if (intent.status && intent.status !== 'succeeded') {
      return {
        success: false,
        paymentIntentId: intent.paymentIntentId,
        status: intent.status,
        error: `Payment not completed. Status: ${intent.status}`,
      };
    }

    return {
      success: true,
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      status: intent.status,
    };
  }

  private async selectiveCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    if (!options.paymentMethodId) {
      throw this.createError('Payment method ID required for selective checkout', 'validation');
    }

    // Validate payment method exists
    const isValid = await this.paymentService.validatePaymentMethod(options.paymentMethodId);
    if (!isValid) {
      throw this.createError('Selected payment method not found', 'validation');
    }

    // Create payment intent with selected method
    const intent = await this.paymentService.createPaymentIntent(options);

    // If the edge function confirmed the payment and returned status, validate it
    if (intent.status && intent.status !== 'succeeded') {
      return {
        success: false,
        paymentIntentId: intent.paymentIntentId,
        status: intent.status,
        error: `Payment not completed. Status: ${intent.status}`,
      };
    }

    // If no status was provided by the edge function, assume server attempted confirmation.
    // To be safe, require that client verifies transactions via transactions endpoint (fetchTransactions)
    return {
      success: true,
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      status: intent.status,
    };
  }

  private async oneTimeCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    // Prevent multiple simultaneous payment sheet presentations across the app
    if (globalPaymentSheetInProgress) {
      return {
        success: false,
        error: 'Another payment is already in progress'
      };
    }
    globalPaymentSheetInProgress = true;

    try {
      console.log('[CheckoutService] oneTimeCheckout - creating payment intent', { amount: options.amount });
      // Create payment intent without saved method (triggers payment sheet)
      const intent = await this.paymentService.createPaymentIntent({
        amount: options.amount,
        description: options.description
        // No paymentMethodId - will use payment sheet
      });

      console.log('[CheckoutService] oneTimeCheckout - payment intent created', { paymentIntentId: intent.paymentIntentId, clientSecret: Boolean(intent.clientSecret) });

      // Initialize and present payment sheet
      const { initPaymentSheet, presentPaymentSheet } = this.stripe;

      // Get client secret for payment sheet
      const clientSecret = intent.clientSecret;

      if (!clientSecret) {
        console.error('[CheckoutService] Missing client secret for payment sheet');
        throw this.createError('Missing client secret for payment sheet', 'stripe');
      }

      console.log('[CheckoutService] initialising payment sheet');
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Payment Agent',
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
        returnURL: 'payment-agent://payment-return',
      });

      if (initError) {
        console.error('[CheckoutService] payment sheet init error', initError);
        throw this.createError(`Payment sheet setup failed: ${initError.message}`, 'stripe');
      }

      console.log('[CheckoutService] presenting payment sheet');
      // Present payment sheet but guard with a timeout to avoid hanging native callbacks
      const presentTimeoutMs = 20000; // 20s
      const presentPromise = presentPaymentSheet();
      const timeoutPromise = new Promise<{ error?: any }>((resolve) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          resolve({ error: { message: 'Payment sheet presentation timed out' } });
        }, presentTimeoutMs);
      });
      const { error: presentError } = await Promise.race([presentPromise, timeoutPromise]);

      if (presentError) {
        console.error('[CheckoutService] payment sheet present error', presentError);
        throw this.createError(`Payment cancelled or failed: ${presentError.message}`, 'stripe');
      }

      console.log('[CheckoutService] payment sheet presented and completed');

      // After presenting the payment sheet, the payment should be processed by Stripe.
      // However, the server is the source of truth for transaction recording. The caller
      // should refresh transactions via the payment hook's fetchTransactions after a
      // successful result to ensure Stripe recorded the payment.
      return {
        success: true,
        paymentIntentId: intent.paymentIntentId,
        clientSecret: intent.clientSecret,
        status: intent.status,
      };
    } catch (err) {
      console.error('[CheckoutService] oneTimeCheckout error', err);
      throw err;
    } finally {
      console.log('[CheckoutService] oneTimeCheckout finalizing, clearing global flag');
      globalPaymentSheetInProgress = false;
    }
  }



  private createError(message: string, type: PaymentError['type']): PaymentError {
    const error = new Error(message) as PaymentError;
    error.type = type;
    return error;
  }
}
