'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { trpc } from '../lib/trpc';
import { authClient } from '../lib/auth';
import posthog from '../lib/posthog-client';
import { useToast } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';
import { useAppFeatures } from '../hooks/useAppFeatures';
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

import { TOUR_STEPS } from "./tour-steps";
export { TOUR_STEPS };

export function ProductTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const utils = trpc.useUtils();

  const { data: session } = authClient.useSession();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [showWelcome, setShowWelcome] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const hasDismissedRef = useRef(false);

  const { hasSimulation, hasAiAssistant } = useAppFeatures();
  const tourSteps = useMemo(() => {
    return TOUR_STEPS.filter((s) => {
      if (s.id === 'afford-check' && !hasSimulation) return false;
      if (s.id === 'ask-penny' && !hasAiAssistant) return false;
      return true;
    });
  }, [hasSimulation, hasAiAssistant]);

  const scopeKey = userPrefQuery.data
    ? `${session?.user?.id ?? ''}:${userPrefQuery.data.tenantId ?? ''}:${userPrefQuery.data.appId}:web`
    : '';
  const lastScopeKeyRef = useRef<string>('');
  useEffect(() => {
    if (scopeKey && lastScopeKeyRef.current !== scopeKey) {
      lastScopeKeyRef.current = scopeKey;
      hasDismissedRef.current = false;
    }
  }, [scopeKey]);

  // Check if tour should prompt on first dashboard visit (scoped per user, tenant, app, platform)
  useEffect(() => {
    if (!userPrefQuery.data || userPrefQuery.isLoading) return;

    const appId = userPrefQuery.data.appId;
    const currentAppPrefs = (userPrefQuery.data.appPreferences?.[appId] || {}) as Record<string, unknown>;
    const tourWeb = currentAppPrefs.tour_web as { has_seen?: boolean } | undefined;
    const hasSeenTour = Boolean(tourWeb?.has_seen ?? currentAppPrefs.has_seen_product_tour);

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
      const existingWebTour = (existingAppPrefs.tour_web || {}) as Record<string, unknown>;

      const updatedWebTour = {
        ...existingWebTour,
        has_seen: true,
        ...(completed
          ? { completed_at: new Date().toISOString() }
          : { dismissed_at: new Date().toISOString() }),
        last_step: currentStep,
      };

      const updatedBlob = {
        ...existingAppPrefs,
        tour_web: updatedWebTour,
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

    const stepDef = tourSteps[currentStep - 1];
    if (!stepDef) return;

    const el = document.querySelector(stepDef.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isTourActive, currentStep, tourSteps]);

  // Re-measure on step or route change
  useEffect(() => {
    if (!isTourActive) return;

    const stepDef = tourSteps[currentStep - 1];
    if (!stepDef) return;

    const currentSearch = searchParams?.toString();
    const currentFullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname;

    if (currentFullPath !== stepDef.route) {
      router.push(stepDef.route);
    }

    let settled = false;
    const tryMeasure = () => {
      const el = document.querySelector(stepDef.selector);
      if (el) {
        settled = true;
        updateTargetRect();
        return true;
      }
      return false;
    };

    if (tryMeasure()) return;

    const observer = new MutationObserver(() => {
      if (!settled && tryMeasure()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        updateTargetRect();
      }
      observer.disconnect();
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [isTourActive, currentStep, pathname, searchParams, router, tourSteps, updateTargetRect]);

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
    if (currentStep < tourSteps.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      posthog.capture('tour_step_viewed', { step: next });
    } else {
      completeTour();
    }
  }, [currentStep, completeTour, tourSteps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const activeStepDef = tourSteps[currentStep - 1];
  const stepConfig: TourStepConfig | null = activeStepDef
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
            isLastStep={currentStep === tourSteps.length}
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
