import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { fmtDateMedium } from '@money-matters/ui';

export interface SubscriptionStatusCardProps {
  planName: string;
  isSubscribed: boolean;
  isCanceling?: boolean | null;
  isTrialActive?: boolean | null;
  nextBillingAt?: string | Date | null;
  subscriptionEndsAt?: string | Date | null;
  syncing: boolean;
  onManualSync: () => void;
  onOpenPortal: () => void;
  onOpenUpgrade: () => void;
  loadingPortal: boolean;
}

export function SubscriptionStatusCard({
  planName,
  isSubscribed,
  isCanceling,
  isTrialActive,
  nextBillingAt,
  subscriptionEndsAt,
  syncing,
  onManualSync,
  onOpenPortal,
  onOpenUpgrade,
  loadingPortal,
}: SubscriptionStatusCardProps) {
  return (
    <View style={styles.card}>
      {/* Eyebrow & Sync Button */}
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrowText}>{t('subscription.currentPlan')}</Text>
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

      {/* Plan Title & Status Badges */}
      <View style={styles.titleBadgeRow}>
        <Text style={styles.planNameText}>{planName}</Text>
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
        {isTrialActive && (
          <View style={styles.trialBadge}>
            <Text style={styles.trialBadgeText}>✨ {t('subscription.trialBadge')}</Text>
          </View>
        )}
      </View>

      {/* Date Subtext */}
      {isSubscribed && !isCanceling && nextBillingAt && (
        <Text style={styles.billingSubtext}>
          {t('subscription.renewsOn', {
            date: fmtDateMedium(nextBillingAt),
          })}
        </Text>
      )}

      {isCanceling && subscriptionEndsAt && (
        <Text style={styles.cancelingSubtext}>
          {t('subscription.cancelingNotice', {
            date: fmtDateMedium(subscriptionEndsAt),
          })}
        </Text>
      )}

      {/* Integrated Action Button */}
      <View style={styles.actionRow}>
        {isSubscribed ? (
          <MobileButton
            variant="secondary"
            label={`${t('subscription.manageSubscription')} ↗`}
            onPress={onOpenPortal}
            loading={loadingPortal}
            disabled={loadingPortal}
          />
        ) : (
          <MobileButton
            variant="primary"
            label={t('subscription.upgradeCta')}
            onPress={onOpenUpgrade}
          />
        )}
      </View>

      {/* Billing Disclosure */}
      <Text style={styles.billingDesc}>{t('subscription.billingDesc')}</Text>

      {/* Australian Support Help Text Footer */}
      <View style={styles.supportFooter}>
        <Text style={styles.supportHelpText}>
          {t('subscription.supportHelpText', { email: 'info@moneymatters.kaesava.au' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  syncBtn: {
    padding: 2,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  planNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderRadius: DESIGN_TOKENS.radius.full,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  cancelingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    borderRadius: DESIGN_TOKENS.radius.full,
  },
  cancelingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  trialBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: DESIGN_TOKENS.radius.full,
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
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
  actionRow: {
    alignItems: 'flex-start',
    marginTop: 2,
  },
  billingDesc: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 17,
  },
  supportFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.divider,
  },
  supportHelpText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
    fontWeight: '500',
    lineHeight: 15,
  },
});
