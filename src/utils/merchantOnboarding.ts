import { MerchantStatus, MerchantOnboardingState, OnboardingStep, UserProfile } from '../types';

export class MerchantOnboardingStateMachine {
  private static readonly ONBOARDING_STEPS: Record<MerchantStatus, OnboardingStep> = {
    none: {
      id: 'none',
      title: 'Get Started',
      description: 'Sign up and verify your account',
      completed: false,
      required: true,
    },
    payment_added: {
      id: 'payment_added',
      title: 'Add Payment Method',
      description: 'Add a payment method for subscription billing',
      completed: false,
      required: true,
    },
    plan_selected: {
      id: 'plan_selected',
      title: 'Choose Plan',
      description: 'Select a merchant subscription plan',
      completed: false,
      required: true,
    },
    plan_purchased: {
      id: 'plan_purchased',
      title: 'Purchase Subscription',
      description: 'Complete payment for your chosen plan',
      completed: false,
      required: true,
    },
    onboarding_started: {
      id: 'onboarding_started',
      title: 'Stripe Connect Setup',
      description: 'Complete Stripe Connect account setup',
      completed: false,
      required: true,
    },
    onboarding_completed: {
      id: 'onboarding_completed',
      title: 'Account Verification',
      description: 'Wait for Stripe to verify your account',
      completed: false,
      required: true,
    },
    active: {
      id: 'active',
      title: 'Active Merchant',
      description: 'Your merchant account is active and ready',
      completed: true,
      required: true,
    },
    suspended: {
      id: 'suspended',
      title: 'Account Suspended',
      description: 'Your merchant account has been suspended',
      completed: false,
      required: true,
    },
  };

  private static readonly STATE_TRANSITIONS: Record<MerchantStatus, MerchantStatus[]> = {
    none: ['payment_added'],
    payment_added: ['plan_selected'],
    plan_selected: ['plan_purchased'],
    plan_purchased: ['onboarding_started'],
    onboarding_started: ['onboarding_completed'],
    onboarding_completed: ['active'],
    active: ['suspended'],
    suspended: ['active'],
  };

  private static readonly NEXT_ACTIONS: Record<MerchantStatus, string> = {
    none: 'Add a payment method to get started',
    payment_added: 'Choose a subscription plan',
    plan_selected: 'Complete payment for your plan',
    plan_purchased: 'Start Stripe Connect onboarding',
    onboarding_started: 'Complete your Stripe Connect setup',
    onboarding_completed: 'Wait for account verification',
    active: 'Your merchant account is ready!',
    suspended: 'Contact support to reactivate your account',
  };

  static getOnboardingState(profile: UserProfile): MerchantOnboardingState {
    const currentStep = profile.merchant_status;
    const steps = this.generateSteps(currentStep);
    const canProceed = this.canProceedToNext(currentStep, profile);
    const nextAction = this.NEXT_ACTIONS[currentStep];

    return {
      currentStep,
      steps,
      canProceed,
      nextAction,
    };
  }

  static canTransitionTo(currentStatus: MerchantStatus, targetStatus: MerchantStatus): boolean {
    const allowedTransitions = this.STATE_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(targetStatus);
  }

  static getNextStatus(currentStatus: MerchantStatus): MerchantStatus | null {
    const allowedTransitions = this.STATE_TRANSITIONS[currentStatus] || [];
    return allowedTransitions[0] || null;
  }

  static isOnboardingComplete(status: MerchantStatus): boolean {
    return status === 'active';
  }

  static requiresAction(status: MerchantStatus): boolean {
    return !['active', 'onboarding_completed'].includes(status);
  }

  private static generateSteps(currentStatus: MerchantStatus): OnboardingStep[] {
    const stepOrder: MerchantStatus[] = [
      'none',
      'payment_added',
      'plan_selected',
      'plan_purchased',
      'onboarding_started',
      'onboarding_completed',
      'active',
    ];

    const currentIndex = stepOrder.indexOf(currentStatus);
    
    return stepOrder.map((status, index) => ({
      ...this.ONBOARDING_STEPS[status],
      completed: index < currentIndex || status === 'active' && currentStatus === 'active',
    }));
  }

  private static canProceedToNext(currentStatus: MerchantStatus, profile: UserProfile): boolean {
    switch (currentStatus) {
      case 'none':
        // Can proceed if user has signed up (profile exists)
        return !!profile.id;
      
      case 'payment_added':
        // Can proceed if user has payment methods (would need to check payment methods)
        return true; // This would be checked against payment methods in real implementation
      
      case 'plan_selected':
        // Can proceed if plan is selected
        return !!profile.current_plan_id;
      
      case 'plan_purchased':
        // Can proceed if subscription is active
        return profile.subscription_status === 'active';
      
      case 'onboarding_started':
        // Can proceed if onboarding URL exists (Stripe Connect started)
        return !!profile.onboarding_url;
      
      case 'onboarding_completed':
        // Can proceed if Connect account exists and is verified
        return !!profile.stripe_connect_account_id;
      
      case 'active':
        // Already at final state
        return false;
      
      case 'suspended':
        // Requires manual intervention
        return false;
      
      default:
        return false;
    }
  }
}

// Utility functions for UI components
export const getMerchantStatusColor = (status: MerchantStatus): string => {
  switch (status) {
    case 'active':
      return '#4CAF50'; // Green
    case 'suspended':
      return '#F44336'; // Red
    case 'onboarding_completed':
      return '#FF9800'; // Orange
    default:
      return '#2196F3'; // Blue
  }
};

export const getMerchantStatusIcon = (status: MerchantStatus): string => {
  switch (status) {
    case 'active':
      return 'check-circle';
    case 'suspended':
      return 'block';
    case 'onboarding_completed':
      return 'hourglass-empty';
    case 'onboarding_started':
      return 'assignment';
    default:
      return 'radio-button-unchecked';
  }
};

export const getProgressPercentage = (status: MerchantStatus): number => {
  const statusOrder: MerchantStatus[] = [
    'none',
    'payment_added',
    'plan_selected',
    'plan_purchased',
    'onboarding_started',
    'onboarding_completed',
    'active',
  ];
  
  const currentIndex = statusOrder.indexOf(status);
  return currentIndex >= 0 ? (currentIndex / (statusOrder.length - 1)) * 100 : 0;
};
