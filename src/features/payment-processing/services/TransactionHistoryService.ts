import { supabase } from '../../../services/supabase';
import { TransactionHistory, TransactionError } from '../types';

export class TransactionHistoryService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Transaction History Management
  async getTransactions(): Promise<TransactionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select(`
          *,
          buyer_profile:pg_user_profiles!buyer_id(full_name, email),
          product_info:pg_products(title, category)
        `)
        .eq('buyer_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw this.createTransactionError(error.message, 'network');
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch transactions');
    }
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<TransactionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select(`
          *,
          buyer_profile:pg_user_profiles!buyer_id(full_name, email),
          product_info:pg_products(title, category)
        `)
        .eq('buyer_id', this.userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw this.createTransactionError(error.message, 'network');
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch transactions by date range');
    }
  }

  async getSellerTransactions(): Promise<TransactionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select(`
          *,
          buyer_profile:pg_user_profiles!buyer_id(full_name, email),
          product_info:pg_products(title, category)
        `)
        .eq('seller_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw this.createTransactionError(error.message, 'network');
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch seller transactions');
    }
  }

  // Business Logic Methods
  calculateTotalRevenue(transactions: TransactionHistory[]): number {
    return transactions
      .filter(t => t.status === 'succeeded' && t.transaction_type === 'payment')
      .reduce((total, t) => total + t.amount, 0);
  }

  calculateMonthlyRevenue(transactions: TransactionHistory[]): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.created_at);
        return t.status === 'succeeded' && 
               t.transaction_type === 'payment' && 
               transactionDate >= startOfMonth;
      })
      .reduce((total, t) => total + t.amount, 0);
  }

  getTransactionsByType(transactions: TransactionHistory[], type: 'payment' | 'subscription' | 'payout'): TransactionHistory[] {
    return transactions.filter(t => t.transaction_type === type);
  }

  getTransactionsByStatus(transactions: TransactionHistory[], status: string): TransactionHistory[] {
    return transactions.filter(t => t.status === status);
  }

  // Error Handling
  private createTransactionError(message: string, type: TransactionError['type'], code?: string): TransactionError {
    const error = new Error(message) as TransactionError;
    error.type = type;
    error.code = code;
    return error;
  }

  private handleError(error: unknown, fallbackMessage: string): TransactionError {
    if (error instanceof Error) {
      if ('type' in error) {
        return error as TransactionError;
      }
      return this.createTransactionError(error.message, 'network');
    }
    return this.createTransactionError(fallbackMessage, 'network');
  }
}
