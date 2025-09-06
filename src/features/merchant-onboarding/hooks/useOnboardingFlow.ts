import { useState, useEffect, useCallback } from 'react';
import { OnboardingFlowService } from '../services/OnboardingFlowService';
import {
  OnboardingState,
  OnboardingProgress,
  MerchantOnboardingError,
} from '../types';

const onboardingFlowService = new OnboardingFlowService();

export const useOnboardingFlow = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress>({
    step: 'welcome',
    completedSteps: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [completed, currentProgress] = await Promise.all([
        onboardingFlowService.hasCompletedOnboarding(),
        onboardingFlowService.getOnboardingProgress(),
      ]);
      
      setHasCompletedOnboarding(completed);
      setProgress(currentProgress);
    } catch (err: any) {
      console.error('Error checking onboarding status:', err);
      setError(err.message || 'Failed to check onboarding status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const completeOnboarding = useCallback(async () => {
    try {
      setError(null);
      await onboardingFlowService.completeOnboarding();
      setHasCompletedOnboarding(true);
      
      // Update progress to completed step
      const completedProgress = await onboardingFlowService.updateOnboardingStep('completed');
      setProgress(completedProgress);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      throw err;
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      setError(null);
      await onboardingFlowService.resetOnboarding();
      setHasCompletedOnboarding(false);
      
      // Reset progress to welcome step
      const resetProgress = await onboardingFlowService.updateOnboardingStep('welcome');
      setProgress(resetProgress);
    } catch (err: any) {
      setError(err.message || 'Failed to reset onboarding');
      throw err;
    }
  }, []);

  const updateStep = useCallback(async (
    step: OnboardingProgress['step'],
    stepData?: Record<string, any>
  ) => {
    try {
      setError(null);
      const updatedProgress = await onboardingFlowService.updateOnboardingStep(step, stepData);
      setProgress(updatedProgress);
      return updatedProgress;
    } catch (err: any) {
      setError(err.message || 'Failed to update onboarding step');
      throw err;
    }
  }, []);

  const markStepCompleted = useCallback(async (step: string) => {
    try {
      setError(null);
      const updatedProgress = await onboardingFlowService.markStepCompleted(step);
      setProgress(updatedProgress);
      return updatedProgress;
    } catch (err: any) {
      setError(err.message || 'Failed to mark step as completed');
      throw err;
    }
  }, []);

  const goToNextStep = useCallback(async () => {
    try {
      setError(null);
      const nextStep = onboardingFlowService.getNextStep(progress.step);
      if (!nextStep) {
        throw new Error('No next step available');
      }
      
      const canProceed = await onboardingFlowService.canProceedToNextStep(progress.step);
      if (!canProceed) {
        throw new Error('Cannot proceed to next step - current step not completed');
      }
      
      return await updateStep(nextStep);
    } catch (err: any) {
      setError(err.message || 'Failed to go to next step');
      throw err;
    }
  }, [progress.step, updateStep]);

  const goToPreviousStep = useCallback(async () => {
    try {
      setError(null);
      const previousStep = onboardingFlowService.getPreviousStep(progress.step);
      if (!previousStep) {
        throw new Error('No previous step available');
      }
      
      return await updateStep(previousStep);
    } catch (err: any) {
      setError(err.message || 'Failed to go to previous step');
      throw err;
    }
  }, [progress.step, updateStep]);

  const clearOnboardingData = useCallback(async () => {
    try {
      setError(null);
      await onboardingFlowService.clearOnboardingData();
      setHasCompletedOnboarding(false);
      setProgress({
        step: 'welcome',
        completedSteps: [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to clear onboarding data');
      throw err;
    }
  }, []);

  // Computed values
  const completionPercentage = progress.completedSteps.length > 0 
    ? Math.round((progress.completedSteps.length / 4) * 100)
    : 0;

  const isStepCompleted = useCallback((step: string) => {
    return progress.completedSteps.includes(step);
  }, [progress.completedSteps]);

  const canProceedToNext = onboardingFlowService.getNextStep(progress.step) !== null;
  const canGoToPrevious = onboardingFlowService.getPreviousStep(progress.step) !== null;

  const stepInfo = {
    current: progress.step,
    next: onboardingFlowService.getNextStep(progress.step),
    previous: onboardingFlowService.getPreviousStep(progress.step),
    isFirst: progress.step === 'welcome',
    isLast: progress.step === 'completed',
  };

  return {
    // State
    hasCompletedOnboarding,
    progress,
    loading,
    error,
    
    // Actions
    completeOnboarding,
    resetOnboarding,
    updateStep,
    markStepCompleted,
    goToNextStep,
    goToPreviousStep,
    clearOnboardingData,
    
    // Computed values
    completionPercentage,
    stepInfo,
    canProceedToNext,
    canGoToPrevious,
    
    // Utility methods
    isStepCompleted,
    isOnboardingComplete: hasCompletedOnboarding,
    needsOnboarding: !hasCompletedOnboarding,
    getCurrentStepData: () => progress.currentStepData,
    
    // Step validation
    canProceedToNextStep: async () => {
      try {
        return await onboardingFlowService.canProceedToNextStep(progress.step);
      } catch {
        return false;
      }
    },
  };
};
