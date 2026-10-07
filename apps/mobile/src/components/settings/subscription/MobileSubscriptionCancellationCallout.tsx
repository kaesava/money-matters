import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { fmtDateMedium } from '@money-matters/ui';

export interface MobileSubscriptionCancellationCalloutProps {
  status?: {
    cancelAtPeriodEnd?: boolean | null;
    subscriptionEndsAt?: string | Date | null;
    nextBillingAt?: string | Date | null;
  } | null;
  isSubscribed: boolean;
  loadingPortal: boolean;
  onOpenPortal: () => void;
}

export function MobileSubscriptionCancellationCallout({
  status,
  isSubscribed,
  loadingPortal,
  onOpenPortal,
}: MobileSubscriptionCancellationCalloutProps) {
  const daysUntilBilling = status?.nextBillingAt
    ? Math.ceil((new Date(status.nextBillingAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : -1;

  const showRenewalNotice =
    isSubscribed &&
    !status?.cancelAtPeriodEnd &&
    daysUntilBilling >= 0 &&
    daysUntilBilling <= 7 &&
    Boolean(status?.nextBillingAt);

  const showCancelingNotice = Boolean(status?.cancelAtPeriodEnd && status?.subscriptionEndsAt);

  if (!showCancelingNotice && !showRenewalNotice) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showCancelingNotice && status?.subscriptionEndsAt && (
        <View style={styles.cancelingCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>⚠️</Text>
            <View style={styles.textWrap}>
              <Text style={styles.cancelingTitle}>
                {t('subscription.cancelingBannerTitle')}
              </Text>
              <Text style={styles.cancelingDesc}>
                {t('subscription.cancelingBannerDesc', {
                  date: fmtDateMedium(status.subscriptionEndsAt),
                })}
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <MobileButton
              variant="primary"
              size="sm"
              label={`${t('subscription.resumeSubscription')} ↗`}
              onPress={onOpenPortal}
              loading={loadingPortal}
              disabled={loadingPortal}
            />
          </View>
        </View>
      )}

      {showRenewalNotice && status?.nextBillingAt && (
        <View style={styles.renewalCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>ℹ️</Text>
            <View style={styles.textWrap}>
              <Text style={styles.renewalTitle}>
                {t('subscription.upcomingRenewalTitle')}
              </Text>
              <Text style={styles.renewalDesc}>
                {t('subscription.upcomingRenewalDesc', {
                  date: fmtDateMedium(status.nextBillingAt),
                })}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  cancelingCard: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
    gap: 10,
  },
  renewalCard: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  icon: {
    fontSize: 16,
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  cancelingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  cancelingDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.warningDark,
    lineHeight: 16,
    fontWeight: '500',
  },
  renewalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  renewalDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.accentDark,
    lineHeight: 16,
    fontWeight: '500',
  },
  actionRow: {
    alignItems: 'flex-start',
  },
});
