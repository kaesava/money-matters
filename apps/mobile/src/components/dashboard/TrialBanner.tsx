import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
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
  let bgColor = '#2563eb';

  if (status.isTrialActive) {
    message = t('subscription.bannerUrgent', { days: String(days) }) || `${days} days left in free trial`;
    bgColor = days <= 3 ? '#ba1a1a' : '#d97706';
  } else if (status.isPastDue) {
    message = t('subscription.bannerPastDue') || 'Payment past due.';
    bgColor = '#d97706';
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
          onPress={() => router.push('/(app)/settings' as never)}
          style={styles.ctaBtn}
        >
          <Text style={styles.ctaText}>
            {t('subscription.upgradeCta') || 'Upgrade'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.dismissBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  dismissBtn: {
    padding: 2,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.8,
  },
});

export default TrialBanner;
