import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatDate } from '../../../lib/format';

export interface SubscriptionStatusCardProps {
  planName: string;
  isSubscribed: boolean;
  isCanceling?: boolean | null;
  nextBillingAt?: string | Date | null;
  subscriptionEndsAt?: string | Date | null;
  syncing: boolean;
  onManualSync: () => void;
}

export function SubscriptionStatusCard({
  planName,
  isSubscribed,
  isCanceling,
  nextBillingAt,
  subscriptionEndsAt,
  syncing,
  onManualSync,
}: SubscriptionStatusCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>{t('subscription.sectionTitle')}</Text>
          <TouchableOpacity
            onPress={onManualSync}
            disabled={syncing}
            style={styles.syncBtn}
            accessibilityLabel={t('subscription.refreshTooltip')}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.sereneBlue} />
            ) : (
              <Feather name="refresh-cw" size={13} color={DESIGN_TOKENS.colors.textMuted} />
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

      {isSubscribed && !isCanceling && nextBillingAt && (
        <Text style={styles.billingSubtext}>
          {t('subscription.renewsOn', {
            date: formatDate(nextBillingAt),
          })}
        </Text>
      )}

      {isCanceling && subscriptionEndsAt && (
        <Text style={styles.cancelingSubtext}>
          {t('subscription.cancelingNotice', {
            date: formatDate(subscriptionEndsAt),
          })}
        </Text>
      )}

      <Text style={styles.cardSubtitle}>{t('subscription.mobilePlanSubtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    color: DESIGN_TOKENS.colors.primary,
  },
  syncBtn: {
    padding: 4,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  cancelingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderRadius: 12,
  },
  cancelingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  planNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary,
  },
  billingSubtext: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: '500',
  },
  cancelingSubtext: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.warningDark,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 16,
  },
});
