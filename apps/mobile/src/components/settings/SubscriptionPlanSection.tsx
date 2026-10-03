import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMobileToast, MobileButton } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';
import { formatDate } from '../../lib/format';
import { MobilePlanPickerModal, PlanChoice } from './MobilePlanPickerModal';
import { MobileInvoiceHistory } from './MobileInvoiceHistory';

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
      toast.error(err instanceof Error ? err.message : 'Failed to launch checkout.', 'Checkout Error');
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
      toast.error(err instanceof Error ? err.message : 'Failed to open customer portal.', 'Billing Portal Error');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>{t('subscription.sectionTitle')}</Text>
          <TouchableOpacity
            onPress={handleManualSync}
            disabled={syncing}
            style={styles.syncBtn}
            accessibilityLabel={t('subscription.refreshTooltip')}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Feather name="refresh-cw" size={13} color="#64748B" />
            )}
          </TouchableOpacity>
        </View>

        {isSubscribed && !isCanceling && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>✓ {t('subscription.activeBadge')}</Text>
          </View>
        )}
        {isCanceling && (
          <View style={styles.cancelingBadge}>
            <Text style={styles.cancelingBadgeText}>⚠️ {t('subscription.cancelingBadge')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.planNameText}>{planName}</Text>

      {isSubscribed && !isCanceling && status?.nextBillingAt && (
        <Text style={styles.billingSubtext}>
          {t('subscription.renewsOn', {
            date: formatDate(status.nextBillingAt),
          })}
        </Text>
      )}

      {isCanceling && status?.subscriptionEndsAt && (
        <Text style={styles.cancelingSubtext}>
          {t('subscription.cancelingNotice', {
            date: formatDate(status.subscriptionEndsAt),
          })}
        </Text>
      )}

      <Text style={styles.cardSubtitle}>
        {t('subscription.mobilePlanSubtitle')}
      </Text>

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
        <MobileInvoiceHistory
          invoices={invoices}
          isLoading={invoicesQuery.isLoading}
        />
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  syncBtn: {
    padding: 4,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  cancelingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  cancelingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  planNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  billingSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  cancelingSubtext: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  btnRow: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
});
