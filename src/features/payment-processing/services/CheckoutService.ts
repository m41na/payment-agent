import { useStripe } from '@stripe/stripe-react-native';
import { PaymentService } from './PaymentService';
import { CheckoutOptions, CheckoutFlow, PaymentResult, PaymentError } from '../types';

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
    const paymentIntentId = await this.paymentService.createPaymentIntent({
      ...options,
      paymentMethodId: defaultMethod.stripe_payment_method_id
    });

    return {
      success: true,
      paymentIntentId
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
    const paymentIntentId = await this.paymentService.createPaymentIntent(options);

    return {
      success: true,
      paymentIntentId
    };
  }

  private async oneTimeCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    // Create payment intent without saved method (triggers payment sheet)
    const paymentIntentId = await this.paymentService.createPaymentIntent({
      amount: options.amount,
      description: options.description
      // No paymentMethodId - will use payment sheet
    });

    // Initialize and present payment sheet
    const { initPaymentSheet, presentPaymentSheet } = this.stripe;
    
    // Get client secret for payment sheet
    const clientSecret = await this.getClientSecret(paymentIntentId);

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Payment Agent',
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: false,
      returnURL: 'payment-agent://payment-return',
    });

    if (initError) {
      throw this.createError(`Payment sheet setup failed: ${initError.message}`, 'stripe');
    }

    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      throw this.createError(`Payment cancelled or failed: ${presentError.message}`, 'stripe');
    }

    return {
      success: true,
      paymentIntentId
    };
  }

  private async getClientSecret(paymentIntentId: string): Promise<string> {
    // This would typically be retrieved from your backend
    // For now, we'll assume it's included in the payment intent creation response
    // In a real implementation, you'd fetch this separately
    return `pi_${paymentIntentId}_secret_placeholder`;
  }

  private createError(message: string, type: PaymentError['type']): PaymentError {
    const error = new Error(message) as PaymentError;
    error.type = type;
    return error;
  }
}
