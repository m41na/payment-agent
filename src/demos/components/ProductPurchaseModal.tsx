import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Card, Text, Button, TextInput, Chip } from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { useMarketplacePayment } from '../contexts/MarketplacePaymentContext';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  seller_id: string;
  inventory_count?: number;
  is_available: boolean;
}

interface ProductPurchaseModalProps {
  visible: boolean;
  onDismiss: () => void;
  product: Product | null;
  onPurchaseComplete: () => void;
}

const ProductPurchaseModal: React.FC<ProductPurchaseModalProps> = ({
  visible,
  onDismiss,
  product,
  onPurchaseComplete,
}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { createPaymentIntent, confirmPayment, loading } = useMarketplacePayment();
  const [quantity, setQuantity] = useState('1');
  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!product) return;

    const qty = parseInt(quantity);
    if (qty < 1 || (product.inventory_count && qty > product.inventory_count)) {
      Alert.alert('Error', 'Invalid quantity selected');
      return;
    }

    setProcessing(true);
    
    try {
      // Create payment intent
      const result = await createPaymentIntent(product.id, qty);
      if (!result) {
        throw new Error('Failed to create payment intent');
      }

      const { paymentIntent } = result;
      
      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Local Marketplace',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: 'Customer',
        },
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();
      
      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          throw new Error(paymentError.message);
        }
        return; // User canceled
      }

      // Confirm payment on backend
      const success = await confirmPayment(paymentIntent.id);
      
      if (success) {
        Alert.alert(
          'Purchase Successful!',
          `You have successfully purchased ${qty}x ${product.title}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onPurchaseComplete();
                onDismiss();
              },
            },
          ]
        );
      } else {
        throw new Error('Payment confirmation failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setProcessing(false);
    }
  };

  const totalPrice = product ? product.price * parseInt(quantity || '1') : 0;
  const platformFee = totalPrice * 0.05; // 5% platform fee
  const maxQuantity = product?.inventory_count || 10;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card>
          <Card.Title title="Purchase Product" />
          <Card.Content>
            {product && (
              <>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
                
                <View style={styles.detailsRow}>
                  <Chip mode="outlined" style={styles.chip}>
                    {product.category}
                  </Chip>
                  <Chip mode="outlined" style={styles.chip}>
                    {product.condition}
                  </Chip>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Price per item:</Text>
                  <Text style={styles.price}>${product.price.toFixed(2)}</Text>
                </View>

                {product.inventory_count && (
                  <Text style={styles.inventory}>
                    {product.inventory_count} available
                  </Text>
                )}

                <TextInput
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.quantityInput}
                  right={
                    <TextInput.Affix 
                      text={`max ${maxQuantity}`} 
                      textStyle={styles.maxText}
                    />
                  }
                />

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text>Subtotal:</Text>
                    <Text>${totalPrice.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text>Platform fee (5%):</Text>
                    <Text>${platformFee.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalText}>Total:</Text>
                    <Text style={styles.totalText}>${totalPrice.toFixed(2)}</Text>
                  </View>
                </View>

                <Text style={styles.feeNote}>
                  Platform fee helps maintain the marketplace and is included in the total price.
                </Text>
              </>
            )}
          </Card.Content>
          <Card.Actions>
            <Button onPress={onDismiss} disabled={processing}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handlePurchase}
              loading={processing || loading}
              disabled={!product || processing || loading}
            >
              Purchase
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 16,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  inventory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  quantityInput: {
    marginBottom: 16,
  },
  maxText: {
    fontSize: 12,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  feeNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ProductPurchaseModal;
