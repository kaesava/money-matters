'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { trpc } from '../lib/trpc';
import posthog from '../lib/posthog-client';
import { useToast } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';
import {
  ProductTourPopover,
  ProductTourSpotlight,
  TourStepConfig,
} from '@money-matters/ui/web';
import { TourWelcomeModal } from '../components/web/TourWelcomeModal';

export interface TourContextValue {
  isTourActive: boolean;
  currentStep: number;
  startTour: () => void;
  dismissWelcome: () => void;
  skipTour: () => void;
}

const ProductTourContext = createContext<TourContextValue | null>(null);

export const TOUR_STEPS: Array<{
  id: string;
  route: string;
  selector: string;
  titleKey: string;
  descKey: string;
  badgeKey?: string;
}> = [
  {
    id: 'envelopes-row',
    route: '/dashboard',
    selector: '[data-tour="envelopes-row"]',
    titleKey: 'tour.steps.envelopesRow.title',
    descKey: 'tour.steps.envelopesRow.desc',
    badgeKey: 'tour.steps.envelopesRow.badge',
  },
  {
    id: 'payday-card',
    route: '/dashboard',
    selector: '[data-tour="payday-card"]',
    titleKey: 'tour.steps.payday.title',
    descKey: 'tour.steps.payday.desc',
    badgeKey: 'tour.steps.payday.badge',
  },
  {
    id: 'afford-check',
    route: '/dashboard',
    selector: '[data-tour="afford-check"]',
    titleKey: 'tour.steps.affordCheck.title',
    descKey: 'tour.steps.affordCheck.desc',
    badgeKey: 'tour.steps.affordCheck.badge',
  },
  {
    id: 'quick-actions',
    route: '/dashboard',
    selector: '[data-tour="quick-actions"]',
    titleKey: 'tour.steps.quickActions.title',
    descKey: 'tour.steps.quickActions.desc',
    badgeKey: 'tour.steps.quickActions.badge',
  },
  {
    id: 'bank-accounts',
    route: '/dashboard',
    selector: '[data-tour="bank-accounts"]',
    titleKey: 'tour.steps.bankAccounts.title',
    descKey: 'tour.steps.bankAccounts.desc',
    badgeKey: 'tour.steps.bankAccounts.badge',
  },
  {
    id: 'upcoming-events',
    route: '/dashboard/income-and-bills?tab=events',
    selector: '[data-tour="upcoming-events"]',
    titleKey: 'tour.steps.upcomingEvents.title',
    descKey: 'tour.steps.upcomingEvents.desc',
    badgeKey: 'tour.steps.upcomingEvents.badge',
  },
  {
    id: 'schedules-tab',
    route: '/dashboard/income-and-bills?tab=streams',
    selector: '[data-tour="schedules-tab"]',
    titleKey: 'tour.steps.schedulesTab.title',
    descKey: 'tour.steps.schedulesTab.desc',
    badgeKey: 'tour.steps.schedulesTab.badge',
  },
  {
    id: 'history-ledger',
    route: '/dashboard/history',
    selector: '[data-tour="history-ledger"]',
    titleKey: 'tour.steps.historyLedger.title',
    descKey: 'tour.steps.historyLedger.desc',
    badgeKey: 'tour.steps.historyLedger.badge',
  },
];

export function ProductTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const utils = trpc.useUtils();

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined);
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [showWelcome, setShowWelcome] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const hasDismissedRef = useRef(false);

  // Check if tour should prompt on first dashboard visit
  useEffect(() => {
    if (!userPrefQuery.data || userPrefQuery.isLoading) return;

    const appId = userPrefQuery.data.appId;
    const currentAppPrefs = (userPrefQuery.data.appPreferences?.[appId] || {}) as Record<string, unknown>;
    const hasSeenTour = Boolean(currentAppPrefs.has_seen_product_tour);

    if (
      !hasSeenTour &&
      !hasDismissedRef.current &&
      userPrefQuery.data.setupCompleted &&
      pathname === '/dashboard' &&
      !isTourActive &&
      !showWelcome
    ) {
      setShowWelcome(true);
      posthog.capture('tour_prompted');
    }
  }, [userPrefQuery.data, userPrefQuery.isLoading, pathname, isTourActive, showWelcome]);

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

      // Optimistically update query cache immediately to prevent re-opening modal
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
        console.warn('Failed to persist product tour status:', err);
      }
    },
    [userPrefQuery.data, updatePrefMutation, utils, currentStep]
  );

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setIsTourActive(true);
    setCurrentStep(1);
    posthog.capture('tour_started');
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    saveTourStatus(false);
    posthog.capture('tour_dismissed', { step: 0 });
  }, [saveTourStatus]);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    saveTourStatus(false);
    posthog.capture('tour_skipped', { step: currentStep });
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  }, [saveTourStatus, currentStep, pathname, router]);

  const completeTour = useCallback(() => {
    setIsTourActive(false);
    saveTourStatus(true);
    posthog.capture('tour_completed');
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
    toast.success(t('tour.completeToast'), t('tour.welcome.title', { name: '' }).replace(', !', '!'));
  }, [saveTourStatus, pathname, router, toast]);

  // Measure and scroll target element
  const updateTargetRect = useCallback(() => {
    if (!isTourActive) {
      setTargetRect(null);
      return;
    }

    const stepDef = TOUR_STEPS[currentStep - 1];
    if (!stepDef) return;

    const el = document.querySelector(stepDef.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isTourActive, currentStep]);

  // Re-measure on step or route change
  useEffect(() => {
    if (!isTourActive) return;

    const stepDef = TOUR_STEPS[currentStep - 1];
    if (!stepDef) return;

    const currentSearch = searchParams?.toString();
    const currentFullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname;

    if (currentFullPath !== stepDef.route) {
      router.push(stepDef.route);
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 350);

    return () => clearTimeout(timer);
  }, [isTourActive, currentStep, pathname, searchParams, router, updateTargetRect]);

  // Document-level outside click to dismiss/skip tour
  useEffect(() => {
    if (!isTourActive) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const popoverEl = document.querySelector('[role="dialog"]');
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        skipTour();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 200);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isTourActive, skipTour]);

  // Re-measure on window resize
  useEffect(() => {
    if (!isTourActive) return;
    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isTourActive, updateTargetRect]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      posthog.capture('tour_step_viewed', { step: next });
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const activeStepDef = TOUR_STEPS[currentStep - 1];
  const stepConfig: TourStepConfig | null = activeStepDef
    ? {
        step: currentStep,
        totalSteps: TOUR_STEPS.length,
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
        dismissWelcome,
        skipTour,
      }}
    >
      {children}

      {showWelcome && (
        <TourWelcomeModal
          isOpen={showWelcome}
          onStartTour={startTour}
          onDismiss={dismissWelcome}
        />
      )}

      {isTourActive && stepConfig && (
        <>
          <ProductTourSpotlight targetRect={targetRect} onDismiss={skipTour} />
          <ProductTourPopover
            stepConfig={stepConfig}
            targetRect={targetRect}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={skipTour}
            isLastStep={currentStep === TOUR_STEPS.length}
          />
        </>
      )}
    </ProductTourContext.Provider>
  );
}

export function useProductTour() {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useProductTour must be used within a ProductTourProvider');
  }
  return context;
}
