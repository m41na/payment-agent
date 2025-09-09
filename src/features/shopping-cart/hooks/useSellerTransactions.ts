import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../user-auth/context/AuthContext';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderUpdateEvent,
} from '../types';

export interface SellerTransaction {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  order_number: string;
  amount: number;
  commission_fee: number;
  net_amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  payment_status: PaymentStatus;
  created_at: string;
  processed_at?: string;
  
  // Order details
  order_items: any[];
  buyer_name?: string;
  buyer_email?: string;
}

export interface TransactionSummary {
  total_sales: number;
  total_orders: number;
  pending_amount: number;
  completed_amount: number;
  commission_paid: number;
  net_earnings: number;
  currency: string;
}

export interface UseSellerTransactionsReturn {
  // State
  transactions: SellerTransaction[];
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Actions
  refreshTransactions: () => Promise<void>;
  getTransactionById: (transactionId: string) => SellerTransaction | null;
  
  // Filters
  filterByStatus: (status: SellerTransaction['status']) => SellerTransaction[];
  filterByDateRange: (startDate: string, endDate: string) => SellerTransaction[];
  
  // Realtime
  subscribeToTransactionUpdates: () => void;
  unsubscribeFromTransactionUpdates: () => void;
}

export const useSellerTransactions = (): UseSellerTransactionsReturn => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<SellerTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  /**
   * Fetch seller transactions
   */
  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch orders where user is the seller
      const { data: orders, error: ordersError } = await supabase
        .from('pg_orders')
        .select(`
          *,
          items:pg_order_items(*),
          buyer:profiles!pg_orders_user_id_fkey(full_name, email)
        `)
        .contains('items', [{ seller_id: user.id }])
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      // Transform orders into seller transactions
      const sellerTransactions: SellerTransaction[] = [];
      
      for (const order of orders || []) {
        // Filter items that belong to this seller
        const sellerItems = order.items.filter((item: any) => item.seller_id === user.id);
        
        if (sellerItems.length > 0) {
          const itemsTotal = sellerItems.reduce((sum: number, item: any) => sum + item.total_price, 0);
          const commissionRate = 0.05; // 5% commission
          const commissionFee = itemsTotal * commissionRate;
          const netAmount = itemsTotal - commissionFee;

          const transaction: SellerTransaction = {
            id: `${order.id}_${user.id}`,
            order_id: order.id,
            seller_id: user.id,
            buyer_id: order.user_id,
            order_number: order.order_number,
            amount: itemsTotal,
            commission_fee: commissionFee,
            net_amount: netAmount,
            currency: order.currency,
            status: getTransactionStatus(order.status, order.payment_status),
            payment_status: order.payment_status,
            created_at: order.created_at,
            processed_at: order.payment_status === PaymentStatus.CAPTURED ? order.updated_at : undefined,
            order_items: sellerItems,
            buyer_name: order.buyer?.full_name,
            buyer_email: order.buyer?.email,
          };

          sellerTransactions.push(transaction);
        }
      }

      setTransactions(sellerTransactions);
      setSummary(calculateTransactionSummary(sellerTransactions));

    } catch (err) {
      console.error('Error fetching seller transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Subscribe to transaction updates
   */
  const subscribeToTransactionUpdates = useCallback(() => {
    if (!user?.id || subscription) return;

    console.log('💰 Subscribing to seller transaction updates for:', user.id);

    const transactionSubscription = supabase
      .channel(`seller_transactions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_orders',
        },
        (payload) => {
          console.log('💸 Transaction update received:', payload);
          handleTransactionUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Transaction subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          console.log('💰 Connected to seller transaction updates - ready for ka-ching!');
        }
      });

    setSubscription(transactionSubscription);
  }, [user?.id, subscription]);

  /**
   * Unsubscribe from transaction updates
   */
  const unsubscribeFromTransactionUpdates = useCallback(() => {
    if (subscription) {
      console.log('🔕 Unsubscribing from transaction updates');
      supabase.removeChannel(subscription);
      setSubscription(null);
      setIsConnected(false);
    }
  }, [subscription]);

  /**
   * Handle transaction updates
   */
  const handleTransactionUpdate = useCallback(async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      // Check if this order involves the current user as a seller
      if (newRecord) {
        const { data: orderItems } = await supabase
          .from('pg_order_items')
          .select('seller_id')
          .eq('order_id', newRecord.id);

        const isSellerInvolved = orderItems?.some((item: any) => item.seller_id === user?.id);
        
        if (isSellerInvolved) {
          // Show ka-ching notifications for sellers! 💰
          if (eventType === 'UPDATE' && 
              newRecord.payment_status === PaymentStatus.CAPTURED && 
              oldRecord?.payment_status !== PaymentStatus.CAPTURED) {
            
            // Calculate seller's portion
            const sellerItems = orderItems?.filter((item: any) => item.seller_id === user?.id) || [];
            const sellerAmount = sellerItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            const netAmount = sellerAmount * 0.95; // After 5% commission

            Alert.alert(
              '💰 Ka-ching! Sale Confirmed!',
              `🎉 Congratulations! You just made a sale!\n\nOrder: #${newRecord.order_number}\nYour earnings: $${netAmount.toFixed(2)}\n\nThe sweet sound of success! 💰`,
              [{ text: 'Awesome!', style: 'default' }]
            );
          }

          // Refresh transactions to get latest data
          await fetchTransactions();
        }
      }
    } catch (error) {
      console.error('Error handling transaction update:', error);
    }
  }, [user?.id, fetchTransactions]);

  /**
   * Refresh transactions
   */
  const refreshTransactions = useCallback(async (): Promise<void> => {
    await fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Get transaction by ID
   */
  const getTransactionById = useCallback((transactionId: string): SellerTransaction | null => {
    return transactions.find(t => t.id === transactionId) || null;
  }, [transactions]);

  /**
   * Filter transactions by status
   */
  const filterByStatus = useCallback((status: SellerTransaction['status']): SellerTransaction[] => {
    return transactions.filter(t => t.status === status);
  }, [transactions]);

  /**
   * Filter transactions by date range
   */
  const filterByDateRange = useCallback((startDate: string, endDate: string): SellerTransaction[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      return transactionDate >= start && transactionDate <= end;
    });
  }, [transactions]);

  /**
   * Calculate transaction summary
   */
  const calculateTransactionSummary = (transactions: SellerTransaction[]): TransactionSummary => {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const pendingTransactions = transactions.filter(t => t.status === 'pending');

    return {
      total_sales: transactions.reduce((sum, t) => sum + t.amount, 0),
      total_orders: transactions.length,
      pending_amount: pendingTransactions.reduce((sum, t) => sum + t.net_amount, 0),
      completed_amount: completedTransactions.reduce((sum, t) => sum + t.net_amount, 0),
      commission_paid: transactions.reduce((sum, t) => sum + t.commission_fee, 0),
      net_earnings: completedTransactions.reduce((sum, t) => sum + t.net_amount, 0),
      currency: 'USD',
    };
  };

  /**
   * Get transaction status based on order status and payment status
   */
  const getTransactionStatus = (orderStatus: OrderStatus, paymentStatus: PaymentStatus): SellerTransaction['status'] => {
    if (paymentStatus === PaymentStatus.CAPTURED && orderStatus === OrderStatus.DELIVERED) {
      return 'completed';
    }
    if (paymentStatus === PaymentStatus.CAPTURED) {
      return 'pending'; // Payment captured but not yet delivered
    }
    if (orderStatus === OrderStatus.CANCELLED || paymentStatus === PaymentStatus.CANCELLED) {
      return 'cancelled';
    }
    if (paymentStatus === PaymentStatus.REFUNDED) {
      return 'refunded';
    }
    return 'pending';
  };

  // Auto-fetch and subscribe when user is available
  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
      subscribeToTransactionUpdates();
    }

    return () => {
      unsubscribeFromTransactionUpdates();
    };
  }, [user?.id, fetchTransactions, subscribeToTransactionUpdates, unsubscribeFromTransactionUpdates]);

  return {
    // State
    transactions,
    summary,
    isLoading,
    error,
    isConnected,
    
    // Actions
    refreshTransactions,
    getTransactionById,
    
    // Filters
    filterByStatus,
    filterByDateRange,
    
    // Realtime
    subscribeToTransactionUpdates,
    unsubscribeFromTransactionUpdates,
  };
};
