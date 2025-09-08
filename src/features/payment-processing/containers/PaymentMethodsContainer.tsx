import React, { useEffect, useCallback } from 'react';
import { useAuth } from '../../../shared/auth/AuthContext';
import { usePayment } from '../hooks/usePayment';
import PaymentMethodsScreen from '../components/PaymentMethodsScreen';

const PaymentMethodsContainer: React.FC = () => {
  const { user } = useAuth();
  const { 
    paymentMethods, 
    loading, 
    removePaymentMethod, 
    setDefaultPaymentMethod, 
    fetchPaymentMethods 
  } = usePayment();

  // Load payment methods on mount
  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user, fetchPaymentMethods]);

  const handleAddPaymentMethod = useCallback(() => {
    // This will be handled directly in the component via Stripe Payment Sheet
    // The webhook will trigger fetchPaymentMethods automatically
  }, []);

  const handleRemovePaymentMethod = useCallback(async (id: string) => {
    try {
      await removePaymentMethod(id);
      // Refresh the list after removal
      await fetchPaymentMethods();
    } catch (error) {
      throw error; // Let the component handle the error display
    }
  }, [removePaymentMethod, fetchPaymentMethods]);

  const handleSetDefaultPaymentMethod = useCallback(async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      // Refresh the list to show updated default status
      await fetchPaymentMethods();
    } catch (error) {
      throw error; // Let the component handle the error display
    }
  }, [setDefaultPaymentMethod, fetchPaymentMethods]);

  const handleRefreshPaymentMethods = useCallback(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return (
    <PaymentMethodsScreen
      paymentMethods={paymentMethods}
      loading={loading}
      onAddPaymentMethod={handleAddPaymentMethod}
      onRemovePaymentMethod={handleRemovePaymentMethod}
      onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
      onRefreshPaymentMethods={handleRefreshPaymentMethods}
    />
  );
};

export default PaymentMethodsContainer;
