import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useMobileToast, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';

export function SubscriptionPlanSection() {
  const toast = useMobileToast();
  const statusQuery = trpc.getSubscriptionStatus.useQuery();
  const checkoutMut = trpc.createCheckoutSession.useMutation();
  const portalMut = trpc.createCustomerPortalSession.useMutation();

  const status = statusQuery.data;
  const isSubscribed = status?.status === 'SUBSCRIBED';
  const isCanceling = status?.cancelAtPeriodEnd;

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
      planName = t('subscription.planTrial');
    } else if (status.status === 'TRIAL_EXPIRED') {
      planName = t('subscription.planExpired');
    } else if (status.status === 'PAST_DUE') {
      planName = t('subscription.planPastDue');
    }
  }

  const handleOpenStripeCheckout = async () => {
    try {
      const res = await checkoutMut.mutateAsync({
        priceId: 'price_founding_member',
        successUrl: 'moneymatters://subscription/success',
        cancelUrl: 'moneymatters://subscription/manage',
      });
      if (res.url) {
        Linking.openURL(res.url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to launch checkout.', 'Checkout Error');
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
        <Text style={styles.cardTitle}>{t('subscription.sectionTitle')}</Text>
        {isSubscribed && !isCanceling && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{t('subscription.activeBadge')}</Text>
          </View>
        )}
        {isCanceling && (
          <View style={styles.cancelingBadge}>
            <Text style={styles.cancelingBadgeText}>{t('subscription.cancelingBadge')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.planNameText}>{planName}</Text>

      <Text style={styles.cardSubtitle}>
        {t('subscription.mobilePlanSubtitle')}
      </Text>

      <View style={styles.btnRow}>
        {isSubscribed ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenStripePortal} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>
              {isCanceling ? t('subscription.resumeSubscription') : t('subscription.mobileManageSubscription')} ↗
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenStripeCheckout} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>{t('subscription.mobileUpgradePlan')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  card: {
    backgroundColor: D.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: D.colors.border,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: D.colors.primary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: D.colors.textMuted,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: D.colors.sereneBlue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: D.colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: D.colors.surfaceVariant,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  cancelingBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cancelingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  planNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: D.colors.primary,
  },
  secondaryBtnText: {
    color: D.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
});
