import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { authClient } from '../../lib/auth';
import { setActiveSessionToken } from '../../lib/trpc';
import * as SecureStore from 'expo-secure-store';

import { PreferencesSection } from '../../components/settings/PreferencesSection';
import { HouseholdPartnerInviteSection } from '../../components/settings/HouseholdPartnerInviteSection';
import { SubscriptionPlanSection } from '../../components/settings/SubscriptionPlanSection';
import { PrivacyGovernanceSection } from '../../components/settings/PrivacyGovernanceSection';

export default function SettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      t('settings.signOut', { defaultValue: 'Sign Out' }),
      t('settings.signOutConfirm', { defaultValue: 'Are you sure you want to sign out?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('settings.signOut', { defaultValue: 'Sign Out' }),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await authClient.signOut();
              await SecureStore.deleteItemAsync('money-matters_session_token');
              await SecureStore.deleteItemAsync('money-matters-session-token');
              setActiveSessionToken(null);
              router.replace('/(auth)/sign-in');
            } catch (err) {
              Alert.alert(
                t('common.error', { defaultValue: 'Error' }),
                err instanceof Error ? err.message : String(err)
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <MobileScreenWrapper
        title={t('settings.title')}
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateCategories={() => router.push('/(app)/categories')}
        onNavigateSettings={() => router.push('/(app)/settings')}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 14 }}>
          {/* Household Profile Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Household Account</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileVal}>{session?.user?.name ?? 'Household User'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileVal}>{session?.user?.email ?? '—'}</Text>
            </View>
          </View>

          {/* Hub Navigation Links */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📂 Management & Logs</Text>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/bank-accounts' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>🏦 Linked Bank Accounts & Statement Import</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/history' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>📜 Payday Allocation History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/archived' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>📦 Archived Categories & Bills</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/notifications' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>🔔 Push Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/bug-report' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>🐛 {t('settings.reportBugLink', { defaultValue: 'Report a Bug' })}</Text>
            </TouchableOpacity>
          </View>

          {/* Composable Vertical Slice Sections */}
          <PreferencesSection />
          <HouseholdPartnerInviteSection />
          <SubscriptionPlanSection />
          <PrivacyGovernanceSection />

          {/* Sign Out Button */}
          <TouchableOpacity
            style={[styles.signOutBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignOut}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutBtnText}>
              {loading ? 'Signing out...' : t('settings.signOut', { defaultValue: 'Sign Out' })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </MobileScreenWrapper>
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
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  profileVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  navLink: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  navLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  signOutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
});
