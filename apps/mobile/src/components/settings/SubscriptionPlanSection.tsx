import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Linking, StyleSheet, AppState, AppStateStatus, Text } from 'react-native';
import { useMobileToast, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';
import { MobilePlanPickerModal, PlanChoice } from './MobilePlanPickerModal';
import { MobileInvoiceHistory } from './MobileInvoiceHistory';
import { SubscriptionStatusCard } from './subscription/SubscriptionStatusCard';
import { MobileSubscriptionCancellationCallout } from './subscription/MobileSubscriptionCancellationCallout';

export function SubscriptionPlanSection() {
  const toast = useMobileToast();
  const [syncing, setSyncing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const awaitingExternalReturn = useRef(false);

  const trpcUtils = trpc.useUtils();
  const statusQuery = trpc.getSubscriptionStatus.useQuery();
  const checkoutMut = trpc.createCheckoutSession.useMutation();
  const portalMut = trpc.createCustomerPortalSession.useMutation();
  const syncMut = trpc.syncSubscription.useMutation();

  const status = statusQuery.data;
  const isSubscribed = status?.status === 'SUBSCRIBED';
  const isCanceling = Boolean(status?.cancelAtPeriodEnd);
  const isTrialActive = status?.status === 'TRIAL_ACTIVE';

  const invoicesQuery = trpc.listInvoices.useQuery(undefined, {
    enabled: isSubscribed || status?.status === 'PAST_DUE',
  });
  const invoices = invoicesQuery.data || [];

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncMut.mutateAsync();
      await Promise.all([
        trpcUtils.getSubscriptionStatus.invalidate(),
        trpcUtils.listInvoices.invalidate(),
      ]);
      toast.success(t('subscription.syncedSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscription.portalError'));
    } finally {
      setSyncing(false);
    }
  };

  const handleSilentSync = useCallback(async () => {
    try {
      await syncMut.mutateAsync();
      await Promise.all([
        trpcUtils.getSubscriptionStatus.invalidate(),
        trpcUtils.listInvoices.invalidate(),
      ]);
      toast.success(t('subscription.syncedSuccess'));
    } catch {
      // Non-blocking sync on app return
    }
  }, [syncMut, trpcUtils, toast]);

  // Dual-trigger auto-reconciliation on returning from Stripe checkout or customer portal
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && awaitingExternalReturn.current) {
        awaitingExternalReturn.current = false;
        handleSilentSync();
      }
    };

    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('stripe_sync=true') || event.url.includes('checkout_success=true')) {
        awaitingExternalReturn.current = false;
        handleSilentSync();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    const linkSub = Linking.addEventListener('url', handleDeepLink);

    // Initial check for deep link on mount
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('stripe_sync=true') || url.includes('checkout_success=true'))) {
        handleSilentSync();
      }
    });

    return () => {
      sub.remove();
      linkSub.remove();
    };
  }, [handleSilentSync]);

  const handleSelectPlan = async (plan: PlanChoice) => {
    setCheckoutLoading(true);
    try {
      const res = await checkoutMut.mutateAsync({
        planType: plan,
        successUrl: 'moneymatters://settings?tab=account-data&stripe_sync=true&checkout_success=true',
        cancelUrl: 'moneymatters://settings?tab=account-data&checkout_canceled=true',
      });
      if (res.url) {
        setPickerVisible(false);
        awaitingExternalReturn.current = true;
        Linking.openURL(res.url);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('subscription.portalError'),
        t('common.error')
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenStripePortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await portalMut.mutateAsync({
        returnUrl: 'moneymatters://settings?tab=account-data&stripe_sync=true',
      });
      if (res.url) {
        awaitingExternalReturn.current = true;
        Linking.openURL(res.url);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('subscription.portalError'),
        t('common.error')
      );
    } finally {
      setLoadingPortal(false);
    }
  };

  let planName = t('subscription.freePlan');
  if (status) {
    if (isSubscribed) {
      if (status.planType === 'founding') {
        planName = t('subscription.planFounding');
      } else if (status.planType === 'annual') {
        planName = t('subscription.planAnnual');
      } else {
        planName = t('subscription.planMonthly');
      }
    } else if (status.status === 'TRIAL_ACTIVE' || status.status === 'TRIAL_GRACE') {
      planName = t('subscription.planTrial', { days: String(status.daysRemainingInTrial ?? 0) });
    } else if (status.status === 'TRIAL_EXPIRED') {
      planName = t('subscription.planExpired');
    } else if (status.status === 'PAST_DUE') {
      planName = t('subscription.planPastDue');
    }
  }

  return (
    <View style={styles.sectionWrapper}>
      <Text style={styles.sectionEyebrow}>{t('subscription.sectionTitle')}</Text>

      <SubscriptionStatusCard
        planName={planName}
        isSubscribed={isSubscribed}
        isCanceling={isCanceling}
        isTrialActive={isTrialActive}
        nextBillingAt={status?.nextBillingAt}
        subscriptionEndsAt={status?.subscriptionEndsAt}
        syncing={syncing}
        onManualSync={handleManualSync}
        onOpenPortal={handleOpenStripePortal}
        onOpenUpgrade={() => setPickerVisible(true)}
        loadingPortal={loadingPortal}
      />

      <MobileSubscriptionCancellationCallout
        status={status}
        isSubscribed={isSubscribed}
        loadingPortal={loadingPortal}
        onOpenPortal={handleOpenStripePortal}
      />

      {(isSubscribed || invoices.length > 0) && (
        <MobileInvoiceHistory invoices={invoices} isLoading={invoicesQuery.isLoading} />
      )}

      <MobilePlanPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectPlan={handleSelectPlan}
        loading={checkoutLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrapper: {
    gap: 8,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
});
