import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';

export function TrialBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const { data: status, isLoading } = trpc.getSubscriptionStatus.useQuery();

  if (isLoading || !status || status.isSubscribed || dismissed) {
    return null;
  }

  const days = status.daysRemainingInTrial ?? 60;
  const showForTrial = status.isTrialActive && days <= 7;
  const showForPastDue = status.isPastDue;

  if (!showForTrial && !showForPastDue) {
    return null;
  }

  let message = '';
  let bgColor: string = DESIGN_TOKENS.colors.sereneBlue;

  if (status.isTrialActive) {
    message = t('subscription.bannerUrgent', { days: String(days) });
    bgColor = days <= 3 ? DESIGN_TOKENS.colors.burnRed : DESIGN_TOKENS.colors.warning;
  } else if (status.isPastDue) {
    message = t('subscription.bannerPastDue');
    bgColor = DESIGN_TOKENS.colors.warning;
  }

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <View style={styles.messageWrap}>
        <Text style={styles.message} numberOfLines={2}>
          ⚡ {message}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/settings?tab=account-data' as never)}
          style={styles.ctaBtn}
        >
          <Text style={styles.ctaText}>
            {t('subscription.upgradeCta')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.dismissBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss banner"
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 10,
  },
  messageWrap: {
    flex: 1,
  },
  message: {
    color: DESIGN_TOKENS.colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaBtn: {
    backgroundColor: DESIGN_TOKENS.colors.onPrimary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: DESIGN_TOKENS.radius.sm,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  dismissBtn: {
    padding: 2,
  },
  dismissText: {
    color: DESIGN_TOKENS.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.8,
  },
});

export default TrialBanner;
