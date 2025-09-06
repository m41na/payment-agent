// ============================================================================
// TRANSACTION HISTORY SERVICE - Analytics & Transaction Management
// ============================================================================

import { supabase } from '../../../shared/data/supabase';
import { 
  TransactionHistoryItem,
  TransactionFilter,
  TransactionAnalytics,
  TransactionSummary,
  TransactionMetrics,
  TransactionHistoryResult,
  StorefrontAnalyticsResult,
  TransactionHistoryOptions,
  StorefrontError,
  StorefrontErrorCode,
  TransactionStatus,
  STOREFRONT_CONSTANTS
} from '../types';

export class TransactionHistoryService {
  private static instance: TransactionHistoryService;
  private analyticsCache = new Map<string, { data: TransactionAnalytics; timestamp: number }>();
  private readonly ANALYTICS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  public static getInstance(): TransactionHistoryService {
    if (!TransactionHistoryService.instance) {
      TransactionHistoryService.instance = new TransactionHistoryService();
    }
    return TransactionHistoryService.instance;
  }

  // ============================================================================
  // TRANSACTION HISTORY OPERATIONS
  // ============================================================================

  async fetchTransactions(
    userId: string,
    filter?: TransactionFilter,
    options?: TransactionHistoryOptions
  ): Promise<TransactionHistoryResult> {
    try {
      const page = options?.page || 1;
      const limit = Math.min(
        options?.limit || STOREFRONT_CONSTANTS.TRANSACTION_LIMITS.DEFAULT_PAGE_SIZE,
        STOREFRONT_CONSTANTS.TRANSACTION_LIMITS.MAX_PAGE_SIZE
      );
      const offset = (page - 1) * limit;

      let query = supabase
        .from('transactions')
        .select(`
          *,
          ${options?.include_items ? 'transaction_items(*),' : ''}
          ${options?.include_customer ? 'profiles!customer_id(full_name, email),' : ''}
          orders!inner(merchant_id)
        `)
        .eq('orders.merchant_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filter) {
        query = this.applyTransactionFilters(query, filter);
      }

      const { data, error, count } = await query;

      if (error) {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      const transactions = data?.map(item => this.transformTransactionFromDatabase(item)) || [];

      return {
        transactions,
        total_count: count || 0,
        page,
        limit,
        has_more: (count || 0) > offset + limit
      };
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  async fetchTransactionById(userId: string, transactionId: string): Promise<TransactionHistoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items(*),
          profiles!customer_id(full_name, email),
          orders!inner(merchant_id)
        `)
        .eq('id', transactionId)
        .eq('orders.merchant_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      return data ? this.transformTransactionFromDatabase(data) : null;
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  async fetchAnalytics(
    userId: string,
    period: string = STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.MONTHLY
  ): Promise<TransactionAnalytics> {
    try {
      // Check cache first
      const cacheKey = `analytics_${userId}_${period}`;
      const cached = this.analyticsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.ANALYTICS_CACHE_TTL) {
        return cached.data;
      }

      const dateRange = this.getDateRangeForPeriod(period);
      const previousDateRange = this.getPreviousDateRange(dateRange);

      // Fetch current period data
      const currentData = await this.fetchPeriodData(userId, dateRange.start, dateRange.end);
      
      // Fetch previous period data for comparison
      const previousData = await this.fetchPeriodData(userId, previousDateRange.start, previousDateRange.end);

      // Fetch year-over-year data
      const yearAgoRange = this.getYearAgoDateRange(dateRange);
      const yearAgoData = await this.fetchPeriodData(userId, yearAgoRange.start, yearAgoRange.end);

      // Calculate metrics and trends
      const metrics = await this.calculateMetrics(userId, dateRange.start, dateRange.end);
      const trends = this.calculateTrends(currentData, previousData);

      const analytics: TransactionAnalytics = {
        summary: currentData,
        metrics,
        trends,
        comparisons: {
          previous_period: previousData,
          year_over_year: yearAgoData
        }
      };

      // Cache the result
      this.analyticsCache.set(cacheKey, { data: analytics, timestamp: Date.now() });

      return analytics;
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  async exportTransactions(
    userId: string,
    filter?: TransactionFilter,
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<string> {
    try {
      // Fetch all transactions matching the filter
      const result = await this.fetchTransactions(userId, filter, { 
        limit: STOREFRONT_CONSTANTS.TRANSACTION_LIMITS.MAX_PAGE_SIZE,
        include_items: true,
        include_customer: true
      });

      if (format === 'csv') {
        return this.generateCSV(result.transactions);
      } else {
        return this.generatePDF(result.transactions);
      }
    } catch (error: any) {
      console.error('Error exporting transactions:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  // ============================================================================
  // SUMMARY CALCULATIONS
  // ============================================================================

  async calculateRevenueSummary(userId: string, dateFrom?: string, dateTo?: string): Promise<TransactionSummary> {
    const defaultDateRange = this.getDateRangeForPeriod(STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.MONTHLY);
    const startDate = dateFrom || defaultDateRange.start;
    const endDate = dateTo || defaultDateRange.end;

    return this.fetchPeriodData(userId, startDate, endDate);
  }

  async getTopProducts(userId: string, limit: number = 10, period?: string): Promise<Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>> {
    try {
      const dateRange = period ? this.getDateRangeForPeriod(period) : null;

      let query = supabase
        .from('transaction_items')
        .select(`
          product_id,
          product_name,
          quantity,
          total_price,
          transactions!inner(
            created_at,
            orders!inner(merchant_id)
          )
        `)
        .eq('transactions.orders.merchant_id', userId);

      if (dateRange) {
        query = query
          .gte('transactions.created_at', dateRange.start)
          .lte('transactions.created_at', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      // Aggregate by product
      const productMap = new Map<string, {
        product_id: string;
        product_name: string;
        quantity_sold: number;
        revenue: number;
      }>();

      data?.forEach(item => {
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.quantity_sold += item.quantity;
          existing.revenue += item.total_price;
        } else {
          productMap.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity_sold: item.quantity,
            revenue: item.total_price
          });
        }
      });

      // Sort by revenue and return top products
      return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error: any) {
      console.error('Error fetching top products:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private applyTransactionFilters(query: any, filter: TransactionFilter): any {
    if (filter.date_from) {
      query = query.gte('created_at', filter.date_from);
    }
    if (filter.date_to) {
      query = query.lte('created_at', filter.date_to);
    }
    if (filter.status && filter.status.length > 0) {
      query = query.in('status', filter.status);
    }
    if (filter.min_amount !== undefined) {
      query = query.gte('amount', filter.min_amount);
    }
    if (filter.max_amount !== undefined) {
      query = query.lte('amount', filter.max_amount);
    }
    if (filter.customer_id) {
      query = query.eq('customer_id', filter.customer_id);
    }
    if (filter.payment_method) {
      query = query.eq('payment_method', filter.payment_method);
    }

    return query;
  }

  private async fetchPeriodData(userId: string, startDate: string, endDate: string): Promise<TransactionSummary> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        net_amount,
        orders!inner(merchant_id)
      `)
      .eq('orders.merchant_id', userId)
      .eq('status', TransactionStatus.COMPLETED)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }

    const transactions = data || [];
    const total_revenue = transactions.reduce((sum, t) => sum + (t.net_amount || 0), 0);
    const total_orders = transactions.length;
    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;

    return {
      total_revenue,
      total_orders,
      average_order_value,
      period_start: startDate,
      period_end: endDate
    };
  }

  private async calculateMetrics(userId: string, startDate: string, endDate: string): Promise<TransactionMetrics> {
    // Calculate daily revenue and orders
    const { data: dailyData } = await supabase
      .from('transactions')
      .select(`
        created_at,
        net_amount,
        orders!inner(merchant_id)
      `)
      .eq('orders.merchant_id', userId)
      .eq('status', TransactionStatus.COMPLETED)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at');

    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    
    dailyData?.forEach(transaction => {
      const date = transaction.created_at.split('T')[0];
      const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
      existing.revenue += transaction.net_amount || 0;
      existing.orders += 1;
      dailyMap.set(date, existing);
    });

    const daily_revenue = Array.from(dailyMap.values()).map(d => d.revenue);
    const daily_orders = Array.from(dailyMap.values()).map(d => d.orders);

    // Get top products
    const top_products = await this.getTopProducts(userId, 5);

    // Calculate customer segments (simplified)
    const customer_segments = [
      { segment: 'New Customers', count: 0, revenue: 0 },
      { segment: 'Returning Customers', count: 0, revenue: 0 }
    ];

    return {
      daily_revenue,
      daily_orders,
      top_products,
      customer_segments
    };
  }

  private calculateTrends(current: TransactionSummary, previous: TransactionSummary) {
    const revenue_growth = previous.total_revenue > 0 
      ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100 
      : 0;

    const order_growth = previous.total_orders > 0
      ? ((current.total_orders - previous.total_orders) / previous.total_orders) * 100
      : 0;

    return {
      revenue_growth,
      order_growth,
      customer_growth: 0 // Placeholder - would need customer data analysis
    };
  }

  private getDateRangeForPeriod(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;

    switch (period) {
      case STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.DAILY:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.WEEKLY:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.MONTHLY:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.QUARTERLY:
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case STOREFRONT_CONSTANTS.ANALYTICS_PERIODS.YEARLY:
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      start: start.toISOString(),
      end
    };
  }

  private getPreviousDateRange(currentRange: { start: string; end: string }): { start: string; end: string } {
    const currentStart = new Date(currentRange.start);
    const currentEnd = new Date(currentRange.end);
    const duration = currentEnd.getTime() - currentStart.getTime();

    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);

    return {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString()
    };
  }

  private getYearAgoDateRange(currentRange: { start: string; end: string }): { start: string; end: string } {
    const currentStart = new Date(currentRange.start);
    const currentEnd = new Date(currentRange.end);

    const yearAgoStart = new Date(currentStart.getFullYear() - 1, currentStart.getMonth(), currentStart.getDate());
    const yearAgoEnd = new Date(currentEnd.getFullYear() - 1, currentEnd.getMonth(), currentEnd.getDate());

    return {
      start: yearAgoStart.toISOString(),
      end: yearAgoEnd.toISOString()
    };
  }

  private transformTransactionFromDatabase(data: any): TransactionHistoryItem {
    return {
      id: data.id,
      order_id: data.order_id,
      customer_id: data.customer_id,
      customer_name: data.profiles?.full_name,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      payment_method: data.payment_method,
      created_at: data.created_at,
      updated_at: data.updated_at,
      items: data.transaction_items?.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })) || [],
      fees: {
        platform_fee: data.platform_fee || 0,
        payment_processing_fee: data.payment_processing_fee || 0,
        stripe_fee: data.stripe_fee || 0
      },
      net_amount: data.net_amount || data.amount
    };
  }

  private generateCSV(transactions: TransactionHistoryItem[]): string {
    const headers = [
      'Transaction ID', 'Order ID', 'Customer', 'Amount', 'Currency', 
      'Status', 'Payment Method', 'Net Amount', 'Created At'
    ];

    const rows = transactions.map(t => [
      t.id,
      t.order_id,
      t.customer_name || 'Unknown',
      t.amount.toString(),
      t.currency,
      t.status,
      t.payment_method,
      t.net_amount.toString(),
      t.created_at
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generatePDF(transactions: TransactionHistoryItem[]): string {
    // This would integrate with a PDF generation library
    // For now, return a placeholder URL
    return 'https://example.com/transaction-report.pdf';
  }

  private createError(code: StorefrontErrorCode, message: string, field?: string): StorefrontError {
    return {
      code,
      message: `STOREFRONT_ERROR: ${message}`,
      field,
    };
  }

  async clearCache(userId?: string): Promise<void> {
    if (userId) {
      // Clear specific user's analytics cache
      for (const key of this.analyticsCache.keys()) {
        if (key.includes(`analytics_${userId}_`)) {
          this.analyticsCache.delete(key);
        }
      }
    } else {
      this.analyticsCache.clear();
    }
  }
}
