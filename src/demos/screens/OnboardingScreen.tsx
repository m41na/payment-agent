import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Payment Agent',
      subtitle: 'Your gateway to local marketplace commerce',
      content: (
        <View style={styles.welcomeContent}>
          <MaterialCommunityIcons name="store" size={80} color="#6200ee" style={styles.welcomeIcon} />
          <Text variant="bodyLarge" style={styles.description}>
            Discover local merchants, browse products and services by proximity, and enjoy seamless payments with Stripe integration.
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#6200ee" />
              <Text variant="bodyMedium" style={styles.featureText}>Location-based browsing</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="cart" size={24} color="#6200ee" />
              <Text variant="bodyMedium" style={styles.featureText}>Seamless checkout experience</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="account" size={24} color="#6200ee" />
              <Text variant="bodyMedium" style={styles.featureText}>Secure payment management</Text>
            </View>
          </View>
        </View>
      )
    },
    {
      title: 'Browse Nearby',
      subtitle: 'Discover local merchants and services',
      content: (
        <View style={styles.stepContent}>
          <MaterialCommunityIcons name="map-search" size={60} color="#6200ee" style={styles.stepIcon} />
          <Text variant="bodyLarge" style={styles.description}>
            The Browse tab shows you nearby merchants sorted by distance. Switch between list and map views to find exactly what you're looking for.
          </Text>
          <Card style={styles.tipCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.tipTitle}>💡 Tip</Text>
              <Text variant="bodyMedium">
                Use the search bar to filter by product name, merchant, or category. The filter button lets you refine results further.
              </Text>
            </Card.Content>
          </Card>
        </View>
      )
    },
    {
      title: 'Shopping & Checkout',
      subtitle: 'Add items to cart and complete purchases',
      content: (
        <View style={styles.stepContent}>
          <MaterialCommunityIcons name="cart-check" size={60} color="#6200ee" style={styles.stepIcon} />
          <Text variant="bodyLarge" style={styles.description}>
            The Cart tab manages your shopping cart and shows your order history. Checkout is powered by Stripe for secure payments.
          </Text>
          <Card style={styles.tipCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.tipTitle}>🔒 Security</Text>
              <Text variant="bodyMedium">
                All payments are processed securely through Stripe. Your payment information is never stored on our servers.
              </Text>
            </Card.Content>
          </Card>
        </View>
      )
    },
    {
      title: 'Become a Merchant',
      subtitle: 'Unlock selling features with a subscription',
      content: (
        <View style={styles.stepContent}>
          <MaterialCommunityIcons name="store-plus" size={60} color="#6200ee" style={styles.stepIcon} />
          <Text variant="bodyLarge" style={styles.description}>
            The Store tab is where merchants manage inventory and view transactions. Subscribe to unlock merchant features and start selling.
          </Text>
          <View style={styles.pricingPreview}>
            <Text variant="titleMedium" style={styles.pricingTitle}>Merchant Plans</Text>
            <Text variant="bodyMedium" style={styles.pricingText}>• Daily: $4.99/day</Text>
            <Text variant="bodyMedium" style={styles.pricingText}>• Monthly: $9.99/month</Text>
            <Text variant="bodyMedium" style={styles.pricingText}>• Annual: $99.99/year (Save 17%)</Text>
          </View>
        </View>
      )
    },
    {
      title: 'Your Profile',
      subtitle: 'Manage account and storefront settings',
      content: (
        <View style={styles.stepContent}>
          <MaterialCommunityIcons name="account-cog" size={60} color="#6200ee" style={styles.stepIcon} />
          <Text variant="bodyLarge" style={styles.description}>
            The Profile tab contains your account settings, payment methods, and storefront customization options for merchants.
          </Text>
          <Card style={styles.tipCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.tipTitle}>🎨 Customization</Text>
              <Text variant="bodyMedium">
                Merchants can customize their storefront with logos, colors, and business information to create a unique brand presence.
              </Text>
            </Card.Content>
          </Card>
        </View>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = steps[currentStep];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotCompleted
                ]}
              />
            ))}
          </View>
          
          <Text variant="headlineMedium" style={styles.title}>
            {currentStepData.title}
          </Text>
          
          <Text variant="bodyLarge" style={styles.subtitle}>
            {currentStepData.subtitle}
          </Text>
        </View>

        <Card style={styles.contentCard}>
          <Card.Content>
            {currentStepData.content}
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="text"
          onPress={handleSkip}
          style={styles.skipButton}
        >
          Skip
        </Button>
        
        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <Button
              mode="outlined"
              onPress={handlePrevious}
              style={styles.navButton}
            >
              Previous
            </Button>
          )}
          
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.navButton}
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#6200ee',
  },
  progressDotCompleted: {
    backgroundColor: '#4caf50',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  contentCard: {
    flex: 1,
    marginBottom: 16,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeIcon: {
    marginBottom: 24,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 24,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  tipCard: {
    width: '100%',
    backgroundColor: '#f3e5f5',
  },
  tipTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pricingPreview: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  pricingTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  pricingText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  skipButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default OnboardingScreen;
