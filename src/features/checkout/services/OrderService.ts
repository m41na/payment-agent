import { supabase } from '../../../services/supabase';
import { Order, OrderItem, OrderError } from '../types';
import { CartItem } from '../../shopping-cart/types';

export class OrderService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Order Creation
  async createOrderFromCart(cartItems: CartItem[]): Promise<Order> {
    if (!cartItems.length) {
      throw this.createOrderError('Cannot create order from empty cart', 'validation');
    }

    try {
      // Group items by merchant for proper order structure
      const merchantGroups = this.groupItemsByMerchant(cartItems);
      
      // Calculate order totals
      const subtotal = cartItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
      const tax = this.calculateTax(subtotal);
      const shipping = this.calculateShipping(cartItems);
      const total = subtotal + tax + shipping;

      // Create order record
      const { data: order, error: orderError } = await supabase
        .from('pg_orders')
        .insert({
          buyer_id: this.userId,
          status: 'pending',
          subtotal: subtotal,
          tax_amount: tax,
          shipping_amount: shipping,
          total_amount: total,
          currency: 'usd',
          merchant_count: Object.keys(merchantGroups).length,
          item_count: cartItems.reduce((total, item) => total + item.quantity, 0)
        })
        .select()
        .single();

      if (orderError) throw this.createOrderError(orderError.message, 'network');

      // Create order items
      const orderItems = await this.createOrderItems(order.id, cartItems);

      return {
        ...order,
        items: orderItems
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to create order from cart');
    }
  }

  // Order Management
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('pg_orders')
        .select(`
          *,
          items:pg_order_items(*)
        `)
        .eq('id', orderId)
        .eq('buyer_id', this.userId)
        .single();

      if (orderError && orderError.code !== 'PGRST116') {
        throw this.createOrderError(orderError.message, 'network');
      }

      return order || null;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'PGRST116') {
        return null; // Order not found
      }
      throw this.handleError(error, 'Failed to fetch order');
    }
  }

  async getUserOrders(): Promise<Order[]> {
    try {
      const { data: orders, error } = await supabase
        .from('pg_orders')
        .select(`
          *,
          items:pg_order_items(*)
        `)
        .eq('buyer_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw this.createOrderError(error.message, 'network');
      return orders || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user orders');
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status'], paymentIntentId?: string): Promise<void> {
    try {
      const updateData: any = { status };
      if (paymentIntentId) {
        updateData.stripe_payment_intent_id = paymentIntentId;
      }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pg_orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('buyer_id', this.userId);

      if (error) throw this.createOrderError(error.message, 'network');
    } catch (error) {
      throw this.handleError(error, 'Failed to update order status');
    }
  }

  // Private helper methods
  private async createOrderItems(orderId: string, cartItems: CartItem[]): Promise<OrderItem[]> {
    const orderItemsData = cartItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      seller_id: item.product_snapshot.seller_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      product_snapshot: item.product_snapshot
    }));

    const { data: orderItems, error } = await supabase
      .from('pg_order_items')
      .insert(orderItemsData)
      .select();

    if (error) throw this.createOrderError(error.message, 'network');
    return orderItems || [];
  }

  private groupItemsByMerchant(cartItems: CartItem[]): Record<string, CartItem[]> {
    return cartItems.reduce((groups, item) => {
      const merchantId = item.product_snapshot.seller_id;
      if (!groups[merchantId]) {
        groups[merchantId] = [];
      }
      groups[merchantId].push(item);
      return groups;
    }, {} as Record<string, CartItem[]>);
  }

  private calculateTax(subtotal: number): number {
    // Simple tax calculation - 8.5% sales tax
    // In production, this would use proper tax calculation service
    return Math.round(subtotal * 0.085 * 100) / 100;
  }

  private calculateShipping(cartItems: CartItem[]): number {
    // Simple shipping calculation - $5 base + $2 per additional item
    // In production, this would use proper shipping calculation service
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    return itemCount > 0 ? 5 + Math.max(0, (itemCount - 1) * 2) : 0;
  }

  // Error Handling
  private createOrderError(message: string, type: OrderError['type'], code?: string): OrderError {
    const error = new Error(message) as OrderError;
    error.type = type;
    error.code = code;
    return error;
  }

  private handleError(error: unknown, fallbackMessage: string): OrderError {
    if (error instanceof Error) {
      if ('type' in error) {
        return error as OrderError;
      }
      return this.createOrderError(error.message, 'network');
    }
    return this.createOrderError(fallbackMessage, 'network');
  }
}
