export interface Order {
  id: string;
  buyer_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  merchant_count: number;
  item_count: number;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  seller_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: {
    title: string;
    description: string;
    image_url: string;
    category: string;
    product_condition: string;
    seller_id: string;
    merchant_name: string;
  };
  created_at: string;
}

export interface CheckoutSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
  merchantCount: number;
}

export interface PaymentOption {
  id: string;
  type: 'express' | 'one_time' | 'saved';
  label: string;
  description: string;
  paymentMethodId?: string;
  isDefault?: boolean;
}

export interface OrderError extends Error {
  code?: string;
  type?: 'validation' | 'network' | 'payment' | 'auth';
}

// UI Component Types
export interface CheckoutScreenProps {
  order: Order;
  paymentOptions: PaymentOption[];
  loading: boolean;
  onSelectPaymentOption: (option: PaymentOption) => void;
  onProcessPayment: () => Promise<void>;
  onCancel: () => void;
}

export interface OrderSummaryProps {
  order: Order;
  summary: CheckoutSummary;
}
