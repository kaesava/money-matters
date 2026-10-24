import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter, useSegments, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { trpc } from '../lib/trpc';
import { usePostHog } from 'posthog-react-native';
import { useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  MobileProductTourSheet,
  MobileTourStepConfig,
} from '@money-matters/ui/mobile';

export interface MobileTourContextValue {
  isTourActive: boolean;
  currentStep: number;
  startTour: () => void;
  skipTour: () => void;
}

const ProductTourContext = createContext<MobileTourContextValue | null>(null);

export const MOBILE_TOUR_STEPS: Array<{
  id: string;
  route: string;
  titleKey: string;
  descKey: string;
  badgeKey?: string;
}> = [
  {
    id: 'hero-metric',
    route: '/(app)/home',
    titleKey: 'tour.steps.hero.title',
    descKey: 'tour.steps.hero.desc',
    badgeKey: 'tour.steps.hero.badge',
  },
  {
    id: 'payday-card',
    route: '/(app)/home',
    titleKey: 'tour.steps.payday.title',
    descKey: 'tour.steps.payday.desc',
    badgeKey: 'tour.steps.payday.badge',
  },
  {
    id: 'envelopes-bento',
    route: '/(app)/home',
    titleKey: 'tour.steps.envelopes.title',
    descKey: 'tour.steps.envelopes.desc',
    badgeKey: 'tour.steps.envelopes.badge',
  },
  {
    id: 'quick-actions',
    route: '/(app)/home',
    titleKey: 'tour.steps.quickActions.title',
    descKey: 'tour.steps.quickActions.desc',
    badgeKey: 'tour.steps.quickActions.badge',
  },
  {
    id: 'bank-accounts',
    route: '/(app)/home',
    titleKey: 'tour.steps.bankAccounts.title',
    descKey: 'tour.steps.bankAccounts.desc',
    badgeKey: 'tour.steps.bankAccounts.badge',
  },
  {
    id: 'matrix-plan',
    route: '/(app)/paychecks',
    titleKey: 'tour.steps.matrixPlan.title',
    descKey: 'tour.steps.matrixPlan.desc',
    badgeKey: 'tour.steps.matrixPlan.badge',
  },
  {
    id: 'history-ledger',
    route: '/(app)/transactions',
    titleKey: 'tour.steps.historyLedger.title',
    descKey: 'tour.steps.historyLedger.desc',
    badgeKey: 'tour.steps.historyLedger.badge',
  },
];

export function MobileProductTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const posthog = usePostHog();
  const { showToast } = useMobileToast();
  const utils = trpc.useUtils();

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined);
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined);
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const hasDismissedRef = useRef(false);

  // Check if tour should prompt on first home visit
  useEffect(() => {
    if (!userPrefQuery.data || userPrefQuery.isLoading || tenantStatusQuery.isLoading) return;

    const appId = userPrefQuery.data.appId;
    const currentAppPrefs = (userPrefQuery.data.appPreferences?.[appId] || {}) as Record<string, unknown>;
    const hasSeenTour = Boolean(currentAppPrefs.has_seen_product_tour);
    const isHomeScreen = segments.includes('home');
    const isSetupCompleted = Boolean(tenantStatusQuery.data?.setupCompleted ?? userPrefQuery.data.setupCompleted);

    if (
      !hasSeenTour &&
      !hasDismissedRef.current &&
      isSetupCompleted &&
      isHomeScreen &&
      !isTourActive
    ) {
      setIsTourActive(true);
      setCurrentStep(1);
      posthog.capture('tour_prompted');
    }
  }, [userPrefQuery.data, userPrefQuery.isLoading, tenantStatusQuery.data, tenantStatusQuery.isLoading, segments, isTourActive, posthog]);

  const saveTourStatus = useCallback(
    async (completed: boolean) => {
      hasDismissedRef.current = true;
      if (!userPrefQuery.data) return;
      const appId = userPrefQuery.data.appId;
      const existingAppPrefs = (userPrefQuery.data.appPreferences?.[appId] || {}) as Record<string, unknown>;

      const updatedBlob = {
        ...existingAppPrefs,
        has_seen_product_tour: true,
        ...(completed
          ? { tour_completed_at: new Date().toISOString() }
          : { tour_dismissed_at: new Date().toISOString() }),
        tour_last_step: currentStep,
      };

      // Optimistically update query cache immediately
      utils.getUserPreferences.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          appPreferences: {
            ...old.appPreferences,
            [appId]: updatedBlob,
          },
        };
      });

      try {
        await updatePrefMutation.mutateAsync({
          appPreferences: {
            [appId]: updatedBlob,
          },
        });
        await utils.getUserPreferences.invalidate();
      } catch (err) {
        console.warn('[MobileTour] Failed to persist tour status:', err);
      }
    },
    [userPrefQuery.data, updatePrefMutation, utils, currentStep]
  );

  const startTour = useCallback(() => {
    setIsTourActive(true);
    setCurrentStep(1);
    posthog.capture('tour_started');
    router.replace('/(app)/home' as Href);
  }, [posthog, router]);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    saveTourStatus(false);
    posthog.capture('tour_skipped', { step: currentStep });
    router.replace('/(app)/home' as Href);
  }, [saveTourStatus, currentStep, posthog, router]);

  const completeTour = useCallback(() => {
    setIsTourActive(false);
    saveTourStatus(true);
    posthog.capture('tour_completed');
    router.replace('/(app)/home' as Href);
    showToast({
      type: 'success',
      title: t('tour.welcome.title', { name: '' }).replace(', !', '!'),
      message: t('tour.completeToast'),
    });
  }, [saveTourStatus, posthog, router, showToast]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentStep < MOBILE_TOUR_STEPS.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      posthog.capture('tour_step_viewed', { step: next });
      const targetStep = MOBILE_TOUR_STEPS[next - 1];
      if (targetStep) {
        router.replace(targetStep.route as Href);
      }
    } else {
      completeTour();
    }
  }, [currentStep, completeTour, posthog, router]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      const targetStep = MOBILE_TOUR_STEPS[prev - 1];
      if (targetStep) {
        router.replace(targetStep.route as Href);
      }
    }
  }, [currentStep, router]);

  const activeStepDef = MOBILE_TOUR_STEPS[currentStep - 1];
  const stepConfig: MobileTourStepConfig | null = activeStepDef
    ? {
        step: currentStep,
        totalSteps: MOBILE_TOUR_STEPS.length,
        titleKey: activeStepDef.titleKey,
        descKey: activeStepDef.descKey,
        badgeKey: activeStepDef.badgeKey,
      }
    : null;

  return (
    <ProductTourContext.Provider
      value={{
        isTourActive,
        currentStep,
        startTour,
        skipTour,
      }}
    >
      {children}

      {isTourActive && stepConfig ? (
        <MobileProductTourSheet
          visible={isTourActive}
          stepConfig={stepConfig}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={skipTour}
          isLastStep={currentStep === MOBILE_TOUR_STEPS.length}
        />
      ) : null}
    </ProductTourContext.Provider>
  );
}

export function useMobileProductTour() {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useMobileProductTour must be used within MobileProductTourProvider');
  }
  return context;
}
