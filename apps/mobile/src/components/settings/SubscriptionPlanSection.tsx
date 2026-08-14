import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, StyleSheet } from 'react-native';
import { trpc } from '../../lib/trpc';

export function SubscriptionPlanSection() {
  const checkoutMut = trpc.createCheckoutSession.useMutation();
  const portalMut = trpc.createCustomerPortalSession.useMutation();

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
      Alert.alert('Checkout Error', err instanceof Error ? err.message : 'Failed to launch checkout.');
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
      Alert.alert('Billing Portal Error', err instanceof Error ? err.message : 'Failed to open customer portal.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💳 Membership & Plan</Text>
      <Text style={styles.cardSubtitle}>
        Manage your Serene Finance household plan, payment methods, and billing cycles.
      </Text>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenStripeCheckout} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Upgrade Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenStripePortal} activeOpacity={0.8}>
          <Text style={styles.secondaryBtnText}>Customer Portal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
});
