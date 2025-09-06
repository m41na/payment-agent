import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import { PaymentProvider } from '../contexts/PaymentContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { InventoryProvider } from '../contexts/InventoryContext';
import { ErrorBoundaryProvider } from './ErrorBoundaryProvider';
import { ThemeProvider } from './ThemeProvider';
import { LoadingProvider } from './LoadingProvider';
import { EventProvider } from '../events/EventProvider';

// Feature providers - now centralized in providers folder
import { UserProfileProvider } from './UserProfileProvider';
import { ProductDiscoveryProvider } from './ProductDiscoveryProvider';
import { PaymentProcessingProvider } from './PaymentProcessingProvider';
import { ReferralSystemProvider } from './ReferralSystemProvider';
import { LocationServicesProvider } from './LocationServicesProvider';
import { StorefrontProvider } from './StorefrontProvider';
import { MessagingProvider } from './MessagingProvider';
import { EventsManagementProvider } from './EventsManagementProvider';
import { InventoryManagementProvider } from './InventoryManagementProvider';
import { ShoppingCartProvider } from './ShoppingCartProvider';
import { MerchantOnboardingProvider } from './MerchantOnboardingProvider';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Unified provider architecture for the entire application.
 * 
 * Provider hierarchy is carefully ordered to ensure proper dependency resolution:
 * 1. Core infrastructure (Error, Theme, Loading)
 * 2. Cross-feature event system (enables loose coupling)
 * 3. Authentication and user context
 * 4. Location services (required by many features)
 * 5. Payment and subscription services
 * 6. Feature-specific providers in dependency order
 * 
 * This architecture enables:
 * - Feature isolation with clear boundaries
 * - Cross-feature data sharing through context
 * - Event-driven communication between features
 * - Centralized error handling and loading states
 * - Consistent theming across all features
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundaryProvider>
      <ThemeProvider>
        <LoadingProvider>
          {/* Cross-Feature Event System - Foundation for loose coupling */}
          <EventProvider>
            
            {/* Core Authentication & User Context */}
            <AuthProvider>
              <UserProfileProvider>
                
                {/* Location Services - Foundation for proximity features */}
                <LocationProvider>
                  <LocationServicesProvider>
                    
                    {/* Payment & Subscription Infrastructure */}
                    <PaymentProvider>
                      <SubscriptionProvider>
                        <PaymentProcessingProvider>
                          
                          {/* Referral System - Affects product discovery */}
                          <ReferralSystemProvider>
                            
                            {/* Product & Inventory Management */}
                            <InventoryProvider>
                              <InventoryManagementProvider>
                                <ProductDiscoveryProvider>
                                  
                                  {/* Shopping & Commerce Features */}
                                  <ShoppingCartProvider>
                                    
                                    {/* Merchant & Storefront Features */}
                                    <MerchantOnboardingProvider>
                                      <StorefrontProvider>
                                        
                                        {/* Events & Communication Features */}
                                        <EventsManagementProvider>
                                          <MessagingProvider>
                                            
                                            {children}
                                            
                                          </MessagingProvider>
                                        </EventsManagementProvider>
                                        
                                      </StorefrontProvider>
                                    </MerchantOnboardingProvider>
                                    
                                  </ShoppingCartProvider>
                                  
                                </ProductDiscoveryProvider>
                              </InventoryManagementProvider>
                            </InventoryProvider>
                            
                          </ReferralSystemProvider>
                          
                        </PaymentProcessingProvider>
                      </SubscriptionProvider>
                    </PaymentProvider>
                    
                  </LocationServicesProvider>
                </LocationProvider>
                
              </UserProfileProvider>
            </AuthProvider>
            
          </EventProvider>
        </LoadingProvider>
      </ThemeProvider>
    </ErrorBoundaryProvider>
  );
};

export default AppProviders;
