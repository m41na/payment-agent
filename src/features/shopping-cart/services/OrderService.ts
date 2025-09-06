import { supabase } from '../../../shared/data/supabase';
import {
  Order,
  OrderItem,
  CreateOrderData,
  OrderOperationResult,
  OrderError,
  OrderFilters,
  OrderSearchResult,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  CartItem,
} from '../types';

export class OrderService {
  /**
   * Create order from cart items
   */
  async createOrder(userId: string, orderData: CreateOrderData): Promise<OrderOperationResult> {
    try {
      // Validate order data
      this.validateCreateOrderData(orderData);

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Calculate order totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxAmount = subtotal * 0.08; // 8% tax rate
      const shippingAmount = this.calculateShipping(orderData.items);
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Create order record
      const orderRecord = {
        user_id: userId,
        order_number: orderNumber,
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
        fulfillment_status: FulfillmentStatus.PENDING,
        subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        currency: 'USD',
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        notes: orderData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: order, error: orderError } = await supabase
        .from('pg_orders')
        .insert(orderRecord)
        .select()
        .single();

      if (orderError) {
        throw this.createError('NETWORK_ERROR', orderError.message, { orderError });
      }

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        seller_id: item.seller_id,
        title: item.title,
        description: item.description,
        price: item.price,
        quantity: item.quantity,
        total_price: item.price * item.quantity,
        image_url: item.image_url,
        product_condition: item.product_condition,
        fulfillment_status: FulfillmentStatus.PENDING,
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('pg_order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        // Rollback order creation
        await supabase.from('pg_orders').delete().eq('id', order.id);
        throw this.createError('NETWORK_ERROR', itemsError.message, { itemsError });
      }

      // Return complete order with items
      const completeOrder = {
        ...order,
        items: createdItems,
      };

      return {
        success: true,
        order: completeOrder,
      };
    } catch (error: any) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(userId: string, orderId: string): Promise<Order | null> {
    try {
      const { data: order, error } = await supabase
        .from('pg_orders')
        .select(`
          *,
          items:pg_order_items(*)
        `)
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching order:', error);
        return null;
      }

      return order || null;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Get user's orders with filtering and pagination
   */
  async getUserOrders(
    userId: string,
    filters: OrderFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<OrderSearchResult> {
    try {
      let query = supabase
        .from('pg_orders')
        .select(`
          *,
          items:pg_order_items(*)
        `, { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.payment_status && filters.payment_status.length > 0) {
        query = query.in('payment_status', filters.payment_status);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.seller_id) {
        query = query.eq('seller_id', filters.seller_id);
      }

      if (filters.min_amount) {
        query = query.gte('total_amount', filters.min_amount);
      }

      if (filters.max_amount) {
        query = query.lte('total_amount', filters.max_amount);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: orders, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        orders: orders || [],
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return {
        orders: [],
        total_count: 0,
        has_more: false,
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    userId: string,
    orderId: string,
    status: OrderStatus
  ): Promise<OrderOperationResult> {
    try {
      const { data: order, error } = await supabase
        .from('pg_orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('user_id', userId)
        .select(`
          *,
          items:pg_order_items(*)
        `)
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      if (!order) {
        throw this.createError('ORDER_NOT_FOUND', 'Order not found');
      }

      return {
        success: true,
        order,
      };
    } catch (error: any) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentIntentId?: string
  ): Promise<OrderOperationResult> {
    try {
      const updateData: any = {
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      };

      if (paymentIntentId) {
        updateData.payment_intent_id = paymentIntentId;
      }

      // Auto-update order status based on payment status
      if (paymentStatus === PaymentStatus.CAPTURED) {
        updateData.status = OrderStatus.CONFIRMED;
      } else if (paymentStatus === PaymentStatus.FAILED) {
        updateData.status = OrderStatus.CANCELLED;
      }

      const { data: order, error } = await supabase
        .from('pg_orders')
        .update(updateData)
        .eq('id', orderId)
        .select(`
          *,
          items:pg_order_items(*)
        `)
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      return {
        success: true,
        order,
      };
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(userId: string, orderId: string, reason?: string): Promise<OrderOperationResult> {
    try {
      const order = await this.getOrderById(userId, orderId);
      if (!order) {
        throw this.createError('ORDER_NOT_FOUND', 'Order not found');
      }

      // Check if order can be cancelled
      if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
        throw this.createError('INVALID_ORDER_DATA', 'Cannot cancel shipped or delivered orders');
      }

      const updateData: any = {
        status: OrderStatus.CANCELLED,
        fulfillment_status: FulfillmentStatus.CANCELLED,
        updated_at: new Date().toISOString(),
      };

      if (reason) {
        updateData.notes = `${order.notes || ''}\nCancellation reason: ${reason}`.trim();
      }

      const { data: updatedOrder, error } = await supabase
        .from('pg_orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('user_id', userId)
        .select(`
          *,
          items:pg_order_items(*)
        `)
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      return {
        success: true,
        order: updatedOrder,
      };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Calculate shipping cost
   */
  private calculateShipping(items: CartItem[]): number {
    const uniqueMerchants = new Set(items.map(item => item.seller_id)).size;
    return uniqueMerchants * 5.99; // $5.99 per merchant
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Validate create order data
   */
  private validateCreateOrderData(data: CreateOrderData): void {
    if (!data.items || data.items.length === 0) {
      throw this.createError('INVALID_ORDER_DATA', 'Order must contain at least one item');
    }

    data.items.forEach((item, index) => {
      if (!item.product_id) {
        throw this.createError('INVALID_ORDER_DATA', `Item ${index + 1}: Product ID is required`);
      }
      if (!item.seller_id) {
        throw this.createError('INVALID_ORDER_DATA', `Item ${index + 1}: Seller ID is required`);
      }
      if (item.price < 0) {
        throw this.createError('INVALID_ORDER_DATA', `Item ${index + 1}: Price cannot be negative`);
      }
      if (item.quantity <= 0) {
        throw this.createError('INVALID_ORDER_DATA', `Item ${index + 1}: Quantity must be greater than 0`);
      }
    });

    if (data.shipping_address) {
      this.validateAddress(data.shipping_address, 'Shipping address');
    }

    if (data.billing_address) {
      this.validateAddress(data.billing_address, 'Billing address');
    }
  }

  /**
   * Validate address data
   */
  private validateAddress(address: any, type: string): void {
    if (!address.name) {
      throw this.createError('INVALID_ORDER_DATA', `${type}: Name is required`);
    }
    if (!address.address_line_1) {
      throw this.createError('INVALID_ORDER_DATA', `${type}: Address line 1 is required`);
    }
    if (!address.city) {
      throw this.createError('INVALID_ORDER_DATA', `${type}: City is required`);
    }
    if (!address.state) {
      throw this.createError('INVALID_ORDER_DATA', `${type}: State is required`);
    }
    if (!address.postal_code) {
      throw this.createError('INVALID_ORDER_DATA', `${type}: Postal code is required`);
    }
    if (!address.country) {
      throw this.createError('INVALID_ORDER_DATA', `${type}: Country is required`);
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    code: OrderError['code'],
    message: string,
    details?: Record<string, any>
  ): OrderError {
    return {
      code,
      message,
      details,
    };
  }
}
