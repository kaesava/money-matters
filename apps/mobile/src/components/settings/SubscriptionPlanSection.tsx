import React, { useState } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { useMobileToast, MobileButton, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';
import { MobilePlanPickerModal, PlanChoice } from './MobilePlanPickerModal';
import { MobileInvoiceHistory } from './MobileInvoiceHistory';
import { SubscriptionStatusCard } from './subscription/SubscriptionStatusCard';

export function SubscriptionPlanSection() {
  const toast = useMobileToast();
  const [syncing, setSyncing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const trpcUtils = trpc.useUtils();
  const statusQuery = trpc.getSubscriptionStatus.useQuery();
  const checkoutMut = trpc.createCheckoutSession.useMutation();
  const portalMut = trpc.createCustomerPortalSession.useMutation();
  const syncMut = trpc.syncSubscription.useMutation();

  const status = statusQuery.data;
  const isSubscribed = status?.status === 'SUBSCRIBED';
  const isCanceling = status?.cancelAtPeriodEnd;

  const invoicesQuery = trpc.listInvoices.useQuery(undefined, {
    enabled: isSubscribed || status?.status === 'PAST_DUE',
  });
  const invoices = invoicesQuery.data || [];

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

  const handleSelectPlan = async (plan: PlanChoice) => {
    setCheckoutLoading(true);
    try {
      const res = await checkoutMut.mutateAsync({
        planType: plan,
        successUrl: 'moneymatters://subscription/success',
        cancelUrl: 'moneymatters://subscription/manage',
      });
      if (res.url) {
        setPickerVisible(false);
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
    try {
      const res = await portalMut.mutateAsync({
        returnUrl: 'moneymatters://settings',
      });
      if (res.url) {
        Linking.openURL(res.url);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('subscription.portalError'),
        t('common.error')
      );
    }
  };

  return (
    <View style={styles.card}>
      <SubscriptionStatusCard
        planName={planName}
        isSubscribed={isSubscribed}
        isCanceling={isCanceling}
        nextBillingAt={status?.nextBillingAt}
        subscriptionEndsAt={status?.subscriptionEndsAt}
        syncing={syncing}
        onManualSync={handleManualSync}
      />

      <View style={styles.btnRow}>
        {isSubscribed ? (
          <MobileButton
            variant="secondary"
            label={`${isCanceling ? t('subscription.resumeSubscription') : t('subscription.mobileManageSubscription')} ↗`}
            onPress={handleOpenStripePortal}
          />
        ) : (
          <MobileButton
            variant="primary"
            label={t('subscription.mobileUpgradePlan')}
            onPress={() => setPickerVisible(true)}
          />
        )}
      </View>

      {/* Invoice History */}
      {(isSubscribed || invoices.length > 0) && (
        <MobileInvoiceHistory invoices={invoices} isLoading={invoicesQuery.isLoading} />
      )}

      {/* 3-Tier Plan Picker Modal */}
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
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 10,
  },
  btnRow: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
});
