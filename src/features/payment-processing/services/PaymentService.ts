import { supabase } from '../../../shared/data/supabase';
import { PaymentMethod, Transaction, CheckoutOptions, PaymentResult, PaymentError } from '../types';

export class PaymentService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Payment Method Management
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('pg_payment_methods')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw this.createPaymentError(error.message, 'network');
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch payment methods');
    }
  }

  async addPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      // Get payment method details from Stripe
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_get-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        throw this.createPaymentError('Failed to retrieve payment method from Stripe', 'stripe');
      }

      const { paymentMethod } = await response.json();
      
      // Check if this is the first payment method (will be default)
      const existingMethods = await this.getPaymentMethods();
      
      // Save to database
      const { error } = await supabase
        .from('pg_payment_methods')
        .insert({
          user_id: this.userId,
          stripe_payment_method_id: paymentMethodId,
          type: paymentMethod.type,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          exp_month: paymentMethod.card?.exp_month,
          exp_year: paymentMethod.card?.exp_year,
          is_default: existingMethods.length === 0,
        });

      if (error) throw this.createPaymentError(error.message, 'network');
    } catch (error) {
      throw this.handleError(error, 'Failed to add payment method');
    }
  }

  async removePaymentMethod(id: string): Promise<void> {
    try {
      // Get the payment method record
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('pg_payment_methods')
        .select('stripe_payment_method_id')
        .eq('id', id)
        .single();

      if (fetchError || !paymentMethod) {
        throw this.createPaymentError('Payment method not found', 'validation');
      }

      // Detach from Stripe
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/pg_detach-payment-method`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paymentMethodId: paymentMethod.stripe_payment_method_id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createPaymentError(errorData.error || 'Failed to remove payment method', 'stripe');
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to remove payment method');
    }
  }

  async setDefaultPaymentMethod(id: string): Promise<void> {
    try {
      // Get the payment method record
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('pg_payment_methods')
        .select('stripe_payment_method_id')
        .eq('id', id)
        .single();

      if (fetchError || !paymentMethod) {
        throw this.createPaymentError('Payment method not found', 'validation');
      }

      // Update in Stripe
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/pg_set-default-payment-method`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paymentMethodId: paymentMethod.stripe_payment_method_id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createPaymentError(errorData.error || 'Failed to set default payment method', 'stripe');
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to set default payment method');
    }
  }

  // Transaction Management
  async getTransactions(): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select('*')
        .eq('buyer_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw this.createPaymentError(error.message, 'network');
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch transactions');
    }
  }

  // Payment Processing
  async createPaymentIntent(options: CheckoutOptions): Promise<string> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          amount: options.amount,
          description: options.description,
          paymentMethodId: options.paymentMethodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw this.createPaymentError(errorData.error || 'Failed to create payment intent', 'stripe');
      }

      const { paymentIntentId } = await response.json();
      
      if (!paymentIntentId) {
        throw this.createPaymentError('No payment intent ID received', 'stripe');
      }

      return paymentIntentId;
    } catch (error) {
      throw this.handleError(error, 'Failed to create payment intent');
    }
  }

  // Business Logic Methods
  async getDefaultPaymentMethod(): Promise<PaymentMethod | null> {
    const methods = await this.getPaymentMethods();
    return methods.find(pm => pm.is_default) || methods[0] || null;
  }

  async validatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    const methods = await this.getPaymentMethods();
    return methods.some(pm => pm.stripe_payment_method_id === paymentMethodId);
  }

  // Error Handling
  private createPaymentError(message: string, type: PaymentError['type'], code?: string): PaymentError {
    const error = new Error(message) as PaymentError;
    error.type = type;
    error.code = code;
    return error;
  }

  private handleError(error: unknown, fallbackMessage: string): PaymentError {
    if (error instanceof Error) {
      if ('type' in error) {
        return error as PaymentError;
      }
      return this.createPaymentError(error.message, 'network');
    }
    return this.createPaymentError(fallbackMessage, 'network');
  }
}
