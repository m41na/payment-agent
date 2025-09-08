import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../user-auth/context/AuthContext';
import { OrderService } from '../services/OrderService';
import {
  Order,
  CreateOrderData,
  OrderError,
  OrderFilters,
  OrderSearchResult,
  OrderStatus,
  PaymentStatus,
} from '../types';

export interface UseOrdersReturn {
  // State
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  isCreatingOrder: boolean;
  error: OrderError | null;
  
  // Pagination
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  
  // Actions
  createOrder: (orderData: CreateOrderData) => Promise<Order | null>;
  getOrder: (orderId: string) => Promise<Order | null>;
  loadOrders: (filters?: OrderFilters, page?: number) => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  
  // Utilities
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getRecentOrders: (limit?: number) => Order[];
  getTotalSpent: () => number;
}

const orderService = new OrderService();
const ORDERS_PER_PAGE = 20;

export const useOrders = (): UseOrdersReturn => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<OrderError | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<OrderFilters>({});

  /**
   * Create new order
   */
  const createOrder = useCallback(async (orderData: CreateOrderData): Promise<Order | null> => {
    if (!user?.id) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'User must be authenticated to create orders',
      });
      return null;
    }

    try {
      setIsCreatingOrder(true);
      setError(null);

      const result = await orderService.createOrder(user.id, orderData);
      
      if (result.success && result.order) {
        // Add new order to the beginning of the list
        setOrders(prev => [result.order!, ...prev]);
        setCurrentOrder(result.order);
        return result.order;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to create order',
        });
        return null;
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to create order',
        details: { error: err },
      });
      return null;
    } finally {
      setIsCreatingOrder(false);
    }
  }, [user?.id]);

  /**
   * Get specific order by ID
   */
  const getOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    if (!user?.id) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'User must be authenticated to get orders',
      });
      return null;
    }

    try {
      setError(null);
      const order = await orderService.getOrderById(user.id, orderId);
      
      if (order) {
        setCurrentOrder(order);
        
        // Update order in the list if it exists
        setOrders(prev => 
          prev.map(o => o.id === order.id ? order : o)
        );
      }
      
      return order;
    } catch (err) {
      console.error('Error getting order:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to get order',
        details: { error: err },
      });
      return null;
    }
  }, [user?.id]);

  /**
   * Load orders with filters and pagination
   */
  const loadOrders = useCallback(async (
    filters: OrderFilters = {},
    page: number = 0
  ): Promise<void> => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const offset = page * ORDERS_PER_PAGE;
      const result = await orderService.getUserOrders(
        user.id,
        filters,
        ORDERS_PER_PAGE,
        offset
      );
      
      if (page === 0) {
        // First page - replace orders
        setOrders(result.orders);
      } else {
        // Additional pages - append orders
        setOrders(prev => [...prev, ...result.orders]);
      }
      
      setTotalCount(result.total_count);
      setHasMore(result.has_more);
      setCurrentPage(page);
      setCurrentFilters(filters);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to load orders',
        details: { error: err },
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Load more orders (pagination)
   */
  const loadMoreOrders = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) return;
    await loadOrders(currentFilters, currentPage + 1);
  }, [hasMore, isLoading, currentFilters, currentPage, loadOrders]);

  /**
   * Update order status
   */
  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: OrderStatus
  ): Promise<boolean> => {
    if (!user?.id) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'User must be authenticated to update orders',
      });
      return false;
    }

    try {
      setError(null);
      const result = await orderService.updateOrderStatus(user.id, orderId, status);
      
      if (result.success && result.order) {
        // Update order in the list
        setOrders(prev => 
          prev.map(order => 
            order.id === orderId ? result.order! : order
          )
        );
        
        // Update current order if it matches
        if (currentOrder?.id === orderId) {
          setCurrentOrder(result.order);
        }
        
        return true;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to update order status',
        });
        return false;
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to update order status',
        details: { error: err },
      });
      return false;
    }
  }, [user?.id, currentOrder]);

  /**
   * Cancel order
   */
  const cancelOrder = useCallback(async (
    orderId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!user?.id) {
      setError({
        code: 'NETWORK_ERROR',
        message: 'User must be authenticated to cancel orders',
      });
      return false;
    }

    try {
      setError(null);
      const result = await orderService.cancelOrder(user.id, orderId, reason);
      
      if (result.success && result.order) {
        // Update order in the list
        setOrders(prev => 
          prev.map(order => 
            order.id === orderId ? result.order! : order
          )
        );
        
        // Update current order if it matches
        if (currentOrder?.id === orderId) {
          setCurrentOrder(result.order);
        }
        
        return true;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to cancel order',
        });
        return false;
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to cancel order',
        details: { error: err },
      });
      return false;
    }
  }, [user?.id, currentOrder]);

  /**
   * Refresh orders
   */
  const refreshOrders = useCallback(async (): Promise<void> => {
    await loadOrders(currentFilters, 0);
  }, [currentFilters, loadOrders]);

  /**
   * Get orders by status
   */
  const getOrdersByStatus = useCallback((status: OrderStatus): Order[] => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  /**
   * Get recent orders
   */
  const getRecentOrders = useCallback((limit: number = 5): Order[] => {
    return orders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }, [orders]);

  /**
   * Calculate total amount spent
   */
  const getTotalSpent = useCallback((): number => {
    return orders
      .filter(order => order.payment_status === PaymentStatus.CAPTURED)
      .reduce((total, order) => total + order.total_amount, 0);
  }, [orders]);

  // Load orders on mount and user change
  useEffect(() => {
    if (user?.id) {
      loadOrders();
    } else {
      setOrders([]);
      setCurrentOrder(null);
      setError(null);
    }
  }, [user?.id, loadOrders]);

  return {
    // State
    orders,
    currentOrder,
    isLoading,
    isCreatingOrder,
    error,
    
    // Pagination
    totalCount,
    hasMore,
    currentPage,
    
    // Actions
    createOrder,
    getOrder,
    loadOrders,
    loadMoreOrders,
    updateOrderStatus,
    cancelOrder,
    refreshOrders,
    
    // Utilities
    getOrdersByStatus,
    getRecentOrders,
    getTotalSpent,
  };
};
