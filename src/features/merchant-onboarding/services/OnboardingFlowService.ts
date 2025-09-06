import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnboardingState,
  OnboardingProgress,
  ONBOARDING_STORAGE_KEY,
  MerchantOnboardingError,
} from '../types';

export class OnboardingFlowService {
  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to save onboarding completion');
    }
  }

  /**
   * Reset onboarding status (for testing/debugging)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to reset onboarding status');
    }
  }

  /**
   * Get current onboarding progress
   */
  async getOnboardingProgress(): Promise<OnboardingProgress> {
    try {
      const progressData = await AsyncStorage.getItem('@onboarding_progress');
      if (progressData) {
        return JSON.parse(progressData);
      }
      
      // Default progress state
      return {
        step: 'welcome',
        completedSteps: [],
      };
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return {
        step: 'welcome',
        completedSteps: [],
      };
    }
  }

  /**
   * Save onboarding progress
   */
  async saveOnboardingProgress(progress: OnboardingProgress): Promise<void> {
    try {
      await AsyncStorage.setItem('@onboarding_progress', JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to save onboarding progress');
    }
  }

  /**
   * Update current onboarding step
   */
  async updateOnboardingStep(
    step: OnboardingProgress['step'],
    stepData?: Record<string, any>
  ): Promise<OnboardingProgress> {
    try {
      const currentProgress = await this.getOnboardingProgress();
      
      // Add previous step to completed if moving forward
      const stepOrder: OnboardingProgress['step'][] = ['welcome', 'account_setup', 'verification', 'completed'];
      const currentIndex = stepOrder.indexOf(currentProgress.step);
      const newIndex = stepOrder.indexOf(step);
      
      let completedSteps = [...currentProgress.completedSteps];
      if (newIndex > currentIndex && !completedSteps.includes(currentProgress.step)) {
        completedSteps.push(currentProgress.step);
      }

      const updatedProgress: OnboardingProgress = {
        step,
        completedSteps,
        currentStepData: stepData,
      };

      await this.saveOnboardingProgress(updatedProgress);
      return updatedProgress;
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to update onboarding step');
    }
  }

  /**
   * Mark a specific step as completed
   */
  async markStepCompleted(step: string): Promise<OnboardingProgress> {
    try {
      const currentProgress = await this.getOnboardingProgress();
      
      if (!currentProgress.completedSteps.includes(step)) {
        currentProgress.completedSteps.push(step);
        await this.saveOnboardingProgress(currentProgress);
      }
      
      return currentProgress;
    } catch (error) {
      console.error('Error marking step completed:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to mark step as completed');
    }
  }

  /**
   * Check if a specific step is completed
   */
  async isStepCompleted(step: string): Promise<boolean> {
    try {
      const progress = await this.getOnboardingProgress();
      return progress.completedSteps.includes(step);
    } catch (error) {
      console.error('Error checking step completion:', error);
      return false;
    }
  }

  /**
   * Get onboarding completion percentage
   */
  async getCompletionPercentage(): Promise<number> {
    try {
      const progress = await this.getOnboardingProgress();
      const totalSteps = 4; // welcome, account_setup, verification, completed
      const completedCount = progress.completedSteps.length;
      
      // Add current step if it's completed
      if (progress.step === 'completed') {
        return 100;
      }
      
      return Math.round((completedCount / totalSteps) * 100);
    } catch (error) {
      console.error('Error calculating completion percentage:', error);
      return 0;
    }
  }

  /**
   * Clear all onboarding data
   */
  async clearOnboardingData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY),
        AsyncStorage.removeItem('@onboarding_progress'),
      ]);
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to clear onboarding data');
    }
  }

  /**
   * Validate onboarding progress data
   */
  validateProgress(progress: any): progress is OnboardingProgress {
    return progress &&
           typeof progress.step === 'string' &&
           Array.isArray(progress.completedSteps) &&
           ['welcome', 'account_setup', 'verification', 'completed'].includes(progress.step);
  }

  /**
   * Get next step in onboarding flow
   */
  getNextStep(currentStep: OnboardingProgress['step']): OnboardingProgress['step'] | null {
    const stepOrder: OnboardingProgress['step'][] = ['welcome', 'account_setup', 'verification', 'completed'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
      return null;
    }
    
    return stepOrder[currentIndex + 1];
  }

  /**
   * Get previous step in onboarding flow
   */
  getPreviousStep(currentStep: OnboardingProgress['step']): OnboardingProgress['step'] | null {
    const stepOrder: OnboardingProgress['step'][] = ['welcome', 'account_setup', 'verification', 'completed'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentIndex <= 0) {
      return null;
    }
    
    return stepOrder[currentIndex - 1];
  }

  /**
   * Check if user can proceed to next step
   */
  async canProceedToNextStep(currentStep: OnboardingProgress['step']): Promise<boolean> {
    try {
      const progress = await this.getOnboardingProgress();
      
      // Check if current step is completed
      if (!progress.completedSteps.includes(currentStep) && currentStep !== 'welcome') {
        return false;
      }
      
      // Additional validation based on step
      switch (currentStep) {
        case 'welcome':
          return true; // Always can proceed from welcome
        case 'account_setup':
          return progress.completedSteps.includes('welcome');
        case 'verification':
          return progress.completedSteps.includes('account_setup');
        case 'completed':
          return false; // Cannot proceed beyond completed
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking if can proceed:', error);
      return false;
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    code: MerchantOnboardingError['code'],
    message: string,
    details?: Record<string, any>
  ): MerchantOnboardingError {
    return {
      code,
      message,
      details,
    };
  }
}
