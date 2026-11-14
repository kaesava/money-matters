import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useRouter, useSegments, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { trpc } from '../lib/trpc';
import { authClient } from '../lib/auth';
import { usePostHog } from 'posthog-react-native';
import { useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { useAppFeatures } from './useAppFeatures';
import {
  MobileProductTourSheet,
  MobileConfirmDialog,
  MobileTourStepConfig,
  TargetLayoutRect,
} from '@money-matters/ui/mobile';

export interface MobileTourContextValue {
  isTourActive: boolean;
  currentStep: number;
  activeTargetRect: TargetLayoutRect | null;
  startTour: () => void;
  skipTour: () => void;
  registerTourTarget: (id: string, rect: TargetLayoutRect | null) => void;
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
    id: 'envelopes-row',
    route: '/(app)/home',
    titleKey: 'tour.steps.envelopesRow.title',
    descKey: 'tour.steps.envelopesRow.desc',
    badgeKey: 'tour.steps.envelopesRow.badge',
  },
  {
    id: 'payday-card',
    route: '/(app)/home',
    titleKey: 'tour.steps.payday.title',
    descKey: 'tour.steps.payday.desc',
    badgeKey: 'tour.steps.payday.badge',
  },
  {
    id: 'afford-check',
    route: '/(app)/home',
    titleKey: 'tour.steps.affordCheck.title',
    descKey: 'tour.steps.affordCheck.desc',
    badgeKey: 'tour.steps.affordCheck.badge',
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
    route: '/(app)/settings/bank-accounts',
    titleKey: 'tour.steps.bankAccounts.title',
    descKey: 'tour.steps.bankAccounts.desc',
    badgeKey: 'tour.steps.bankAccounts.badge',
  },
  {
    id: 'upcoming-events',
    route: '/(app)/plan',
    titleKey: 'tour.steps.upcomingEvents.title',
    descKey: 'tour.steps.upcomingEvents.desc',
    badgeKey: 'tour.steps.upcomingEvents.badge',
  },
  {
    id: 'schedules-tab',
    route: '/(app)/plan/schedules',
    titleKey: 'tour.steps.schedulesTab.title',
    descKey: 'tour.steps.schedulesTab.desc',
    badgeKey: 'tour.steps.schedulesTab.badge',
  },
  {
    id: 'history-ledger',
    route: '/(app)/history',
    titleKey: 'tour.steps.historyLedger.title',
    descKey: 'tour.steps.historyLedger.desc',
    badgeKey: 'tour.steps.historyLedger.badge',
  },
  {
    id: 'ask-penny',
    route: '/(app)/home',
    titleKey: 'tour.steps.askPenny.title',
    descKey: 'tour.steps.askPenny.desc',
    badgeKey: 'tour.steps.askPenny.badge',
  },
];

export function MobileProductTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const posthog = usePostHog();
  const { showToast } = useMobileToast();
  const utils = trpc.useUtils();

  const { data: session } = authClient.useSession();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [isTourActive, setIsTourActive] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [targetRects, setTargetRects] = useState<Record<string, TargetLayoutRect | null>>({});
  const hasDismissedRef = useRef(false);

  const { hasSimulation, hasAiAssistant } = useAppFeatures();
  const tourSteps = useMemo(() => {
    return MOBILE_TOUR_STEPS.filter(
      (s) =>
        (s.id !== 'afford-check' || hasSimulation) &&
        (s.id !== 'ask-penny' || hasAiAssistant)
    );
  }, [hasSimulation, hasAiAssistant]);

  // Reset local dismissal guard when active user or tenant changes
  useEffect(() => {
    hasDismissedRef.current = false;
  }, [session?.user?.id, tenantStatusQuery.data?.tenantId]);

  const registerTourTarget = useCallback((id: string, rect: TargetLayoutRect | null) => {
    setTargetRects((prev) => ({ ...prev, [id]: rect }));
  }, []);

  // Check if tour should prompt on first home visit
  useEffect(() => {
    if (!userPrefQuery.data || userPrefQuery.isLoading || tenantStatusQuery.isLoading) return;

    const appId = userPrefQuery.data.appId;
    const currentAppPrefs = (userPrefQuery.data.appPreferences?.[appId] || {}) as Record<string, unknown>;
    const tourMobile = currentAppPrefs.tour_mobile as { has_seen?: boolean } | undefined;
    const hasSeenTour = Boolean(tourMobile?.has_seen);
    const isHomeScreen = segments.includes('home');
    const isSetupCompleted = Boolean(tenantStatusQuery.data?.setupCompleted ?? userPrefQuery.data.setupCompleted);

    if (
      !hasSeenTour &&
      !hasDismissedRef.current &&
      isSetupCompleted &&
      isHomeScreen &&
      !isTourActive &&
      !showWelcomeModal
    ) {
      setShowWelcomeModal(true);
      posthog.capture('tour_prompted');
    }
  }, [userPrefQuery.data, userPrefQuery.isLoading, tenantStatusQuery.data, tenantStatusQuery.isLoading, segments, isTourActive, showWelcomeModal, posthog]);

  const saveTourStatus = useCallback(
    async (completed: boolean) => {
      hasDismissedRef.current = true;
      if (!userPrefQuery.data) return;
      const appId = userPrefQuery.data.appId;
      const existingAppPrefs = (userPrefQuery.data.appPreferences?.[appId] || {}) as Record<string, unknown>;
      const existingTourMobile = (existingAppPrefs.tour_mobile || {}) as Record<string, unknown>;

      const updatedBlob = {
        ...existingAppPrefs,
        tour_mobile: {
          ...existingTourMobile,
          has_seen: true,
          ...(completed
            ? { completed_at: new Date().toISOString() }
            : { dismissed_at: new Date().toISOString() }),
          last_step: currentStep,
        },
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
    setShowWelcomeModal(false);
    setIsTourActive(true);
    setCurrentStep(1);
    posthog.capture('tour_started');
    router.replace('/(app)/home' as Href);
  }, [posthog, router]);

  const skipTour = useCallback(() => {
    setShowWelcomeModal(false);
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
    if (currentStep < tourSteps.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      posthog.capture('tour_step_viewed', { step: next });
      const targetStep = tourSteps[next - 1];
      if (targetStep) {
        router.replace(targetStep.route as Href);
      }
    } else {
      completeTour();
    }
  }, [currentStep, completeTour, posthog, router, tourSteps]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      const targetStep = tourSteps[prev - 1];
      if (targetStep) {
        router.replace(targetStep.route as Href);
      }
    }
  }, [currentStep, router, tourSteps]);

  const activeStepDef = tourSteps[currentStep - 1];
  const activeTargetRect = activeStepDef ? targetRects[activeStepDef.id] ?? null : null;
  const stepConfig: MobileTourStepConfig | null = activeStepDef
    ? {
        step: currentStep,
        totalSteps: tourSteps.length,
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
        activeTargetRect,
        startTour,
        skipTour,
        registerTourTarget,
      }}
    >
      {children}

      <MobileConfirmDialog
        visible={showWelcomeModal}
        title={t('tour.welcome.title', {
          name: session?.user?.name?.split(' ')[0] || '',
        }).replace(', !', '!')}
        message={t('tour.welcome.subtitle')}
        confirmText={t('tour.welcome.startAction')}
        cancelText={t('tour.welcome.dismissAction')}
        onConfirm={startTour}
        onCancel={skipTour}
      />

      {isTourActive && stepConfig ? (
        <MobileProductTourSheet
          visible={isTourActive}
          stepConfig={stepConfig}
          targetRect={activeTargetRect}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={skipTour}
          isLastStep={currentStep === tourSteps.length}
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
