import React, { createContext, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { EventProvider } from '../events/EventProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import { PaymentProvider } from '../contexts/PaymentContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { InventoryProvider } from '../contexts/InventoryContext';

// Add first batch of feature providers (TESTED - WORKING)
import { UserProfileProvider } from '../providers/UserProfileProvider';
import { LocationServicesProvider } from '../providers/LocationServicesProvider';
import { PaymentProcessingProvider } from '../providers/PaymentProcessingProvider';

// Add next provider one by one for testing
import { ReferralSystemProvider } from '../providers/ReferralSystemProvider';
import { ProductDiscoveryProvider } from '../providers/ProductDiscoveryProvider';
import { InventoryManagementProvider } from '../providers/InventoryManagementProvider';
import { ShoppingCartProvider } from '../providers/ShoppingCartProvider';
import { MerchantOnboardingProvider } from '../providers/MerchantOnboardingProvider';
import { StorefrontProvider } from '../providers/StorefrontProvider';
import { EventsManagementProvider } from '../providers/EventsManagementProvider';
import { MessagingProvider } from '../providers/MessagingProvider';

import { Button } from '../components/shared/Button';
import { Card } from '../components/shared/Card';
import { Input } from '../components/shared/Input';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Modal } from '../components/shared/Modal';

/**
 * Minimal Foundation Test - Isolating MessagingProvider
 * 
 * Testing MessagingProvider individually to identify if it causes
 * the DISCONNECTED error.
 * 
 * Current providers being tested:
 * - Core providers (Theme, Event, Auth, Location, Payment, Subscription, Inventory)
 * - UserProfileProvider (WORKING)
 * - LocationServicesProvider (WORKING)
 * - PaymentProcessingProvider (FIXED - was using wrong AuthContext import)
 * - ReferralSystemProvider (WORKING)
 * - ProductDiscoveryProvider (WORKING)
 * - InventoryManagementProvider (FIXED - Supabase realtime API issue)
 * - ShoppingCartProvider (WORKING)
 * - MerchantOnboardingProvider (WORKING - useAuth imports FIXED)
 * - StorefrontProvider (WORKING)
 * - MessagingProvider (TESTING NOW)
 */
export const MinimalFoundationTest: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <ThemeProvider>
      <EventProvider>
        <AuthProvider>
          <UserProfileProvider>
            <LocationProvider>
              <LocationServicesProvider>
                <PaymentProvider>
                  <SubscriptionProvider>
                    <PaymentProcessingProvider>
                      <ReferralSystemProvider>
                        <ProductDiscoveryProvider>
                          <InventoryManagementProvider>
                            <ShoppingCartProvider>
                              <MerchantOnboardingProvider>
                                <StorefrontProvider>
                                  <EventsManagementProvider>
                                    <MessagingProvider>
                                      <InventoryProvider>
                                        <ScrollView style={styles.container}>
                                          <View style={styles.content}>
                                            <Text style={styles.title}>Isolating MessagingProvider Test</Text>
                                            <Text style={styles.subtitle}>
                                              Testing MessagingProvider individually to identify if it causes the DISCONNECTED error.
                                            </Text>

                                            <Card variant="elevated" style={styles.section}>
                                              <Text style={styles.sectionTitle}>Button Components</Text>
                                              <View style={styles.buttonRow}>
                                                <Button variant="primary" size="sm" title="Primary" onPress={() => console.log('Primary pressed')} />
                                                <Button variant="secondary" size="sm" title="Secondary" onPress={() => console.log('Secondary pressed')} />
                                                <Button variant="outline" size="sm" title="Outline" onPress={() => console.log('Outline pressed')} />
                                              </View>
                                              <View style={styles.buttonRow}>
                                                <Button variant="ghost" size="sm" title="Ghost" onPress={() => console.log('Ghost pressed')} />
                                                <Button variant="danger" size="sm" title="Danger" onPress={() => console.log('Danger pressed')} />
                                                <Button variant="primary" size="sm" title="Loading" loading onPress={() => console.log('Loading pressed')} />
                                              </View>
                                            </Card>

                                            <Card variant="outlined" style={styles.section}>
                                              <Text style={styles.sectionTitle}>Input Components</Text>
                                              <Input
                                                label="Test Input"
                                                placeholder="Enter text here"
                                                variant="default"
                                              />
                                              <Input
                                                label="Filled Input"
                                                placeholder="Filled variant"
                                                variant="filled"
                                                style={{ marginTop: 12 }}
                                              />
                                            </Card>

                                            <Card variant="flat" style={styles.section}>
                                              <Text style={styles.sectionTitle}>Loading & Modal</Text>
                                              <View style={styles.buttonRow}>
                                                <Button 
                                                  variant="outline" 
                                                  size="sm"
                                                  onPress={() => setModalVisible(true)}
                                                >
                                                  Open Modal
                                                </Button>
                                                <LoadingSpinner size="small" />
                                              </View>
                                            </Card>

                                            <Modal
                                              visible={modalVisible}
                                              onClose={() => setModalVisible(false)}
                                              title="Test Modal"
                                              size="medium"
                                            >
                                              <Text>Testing MessagingProvider to identify if it causes the DISCONNECTED error.</Text>
                                            </Modal>
                                          </View>
                                        </ScrollView>
                                      </InventoryProvider>
                                    </MessagingProvider>
                                  </EventsManagementProvider>
                                </StorefrontProvider>
                              </MerchantOnboardingProvider>
                            </ShoppingCartProvider>
                          </InventoryManagementProvider>
                        </ProductDiscoveryProvider>
                      </ReferralSystemProvider>
                    </PaymentProcessingProvider>
                  </SubscriptionProvider>
                </PaymentProvider>
              </LocationServicesProvider>
            </LocationProvider>
          </UserProfileProvider>
        </AuthProvider>
      </EventProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
});
