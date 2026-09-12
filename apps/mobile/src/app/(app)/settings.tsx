import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { authClient } from '../../lib/auth';
import { setActiveSessionToken } from '../../lib/trpc';
import * as SecureStore from 'expo-secure-store';

import { MobileProfileSection } from '../../components/settings/MobileProfileSection';
import { HouseholdDetailsSection } from '../../components/settings/HouseholdDetailsSection';
import { PreferencesSection } from '../../components/settings/PreferencesSection';
import { HouseholdPartnerInviteSection } from '../../components/settings/HouseholdPartnerInviteSection';
import { SubscriptionPlanSection } from '../../components/settings/SubscriptionPlanSection';
import { PrivacyGovernanceSection } from '../../components/settings/PrivacyGovernanceSection';
import { HouseholdDangerZoneSection } from '../../components/settings/HouseholdDangerZoneSection';
import { FeedbackFormModal } from '../../components/FeedbackFormModal';

import { getMobileVersionInfo } from '../../lib/version';

export default function SettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const versionInfo = getMobileVersionInfo();

  const handleCopyDiagnostics = () => {
    setCopied(true);
    Alert.alert(
      'App Diagnostics',
      `Money Matters ${versionInfo.formattedVersion}\nPlatform: ${versionInfo.platform}\nChannel: ${versionInfo.channel}\nGit Commit: ${versionInfo.gitCommit}`,
      [{ text: 'OK', onPress: () => setCopied(false) }]
    );
  };

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
          {/* User Profile & Timezone */}
          <MobileProfileSection />

          {/* Household Profile & Location Details */}
          <HouseholdDetailsSection />

          {/* Hub Navigation Links */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📂 Management & Logs</Text>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/bank-accounts' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>🏦 {t('settings.bankAccountsLink', { defaultValue: 'Linked Bank Accounts & Balances' })}</Text>
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
              <Text style={styles.navLinkText}>📦 Archived Categories, Pools & Bills</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/(app)/settings/notifications' as Href)}
              activeOpacity={0.8}
            >
              <Text style={styles.navLinkText}>🔔 Push Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Composable Vertical Slice Sections */}
          <PreferencesSection />
          <HouseholdPartnerInviteSection />
          <SubscriptionPlanSection />
          <PrivacyGovernanceSection />
          <HouseholdDangerZoneSection />

          {/* Feedback & Support Button */}
          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => setFeedbackVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="message-square" size={16} color="#2563eb" />
            <Text style={styles.feedbackBtnText}>Provide Feedback or Report a Problem</Text>
          </TouchableOpacity>

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

          {/* Inconspicuous Version Footer */}
          <TouchableOpacity
            onPress={handleCopyDiagnostics}
            activeOpacity={0.7}
            style={{ paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>
              Money Matters {versionInfo.formattedVersion} • {versionInfo.channel} channel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </MobileScreenWrapper>

      {/* Feedback Modal */}
      <FeedbackFormModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
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
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
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
  feedbackBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  signOutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
});
