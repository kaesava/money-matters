import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  SegmentedTabs,
  SegmentTabItem,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { authClient } from '../../lib/auth';
import { setActiveSessionToken, trpc } from '../../lib/trpc';
import * as SecureStore from 'expo-secure-store';

import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { MobileProfileSection } from '../../components/settings/MobileProfileSection';
import { HouseholdDetailsSection } from '../../components/settings/HouseholdDetailsSection';
import { PreferencesSection } from '../../components/settings/PreferencesSection';
import { HouseholdPartnerInviteSection } from '../../components/settings/HouseholdPartnerInviteSection';
import { SubscriptionPlanSection } from '../../components/settings/SubscriptionPlanSection';
import { PrivacyGovernanceSection } from '../../components/settings/PrivacyGovernanceSection';
import { HouseholdDangerZoneSection } from '../../components/settings/HouseholdDangerZoneSection';
import { FeedbackFormModal } from '../../components/FeedbackFormModal';
import { MobileTenantSwitcherModal } from '../../components/settings/MobileTenantSwitcherModal';

import { getMobileVersionInfo } from '../../lib/version';

import { MobileArchivedSection } from '../../components/settings/MobileArchivedSection';

export type SettingsTab = 'profile' | 'household' | 'archived' | 'account-data';

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [tenantSwitcherVisible, setTenantSwitcherVisible] = useState(false);

  const { data: tenants } = trpc.listUserTenants.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const tenantsList = tenants ?? [];
  const currentTenant = tenantsList.find((t) => t.isCurrent) || tenantsList[0];

  const versionInfo = getMobileVersionInfo();

  const handleCopyDiagnostics = () => {
    toast.info(
      `Money Matters ${versionInfo.formattedVersion} (${versionInfo.channel})\nCommit: ${versionInfo.gitCommit}`
    );
  };

  const handleSignOut = async () => {
    showMobileConfirm({
      title: t('settings.signOut', { defaultValue: 'Sign Out' }),
      message: t('settings.signOutConfirm', { defaultValue: 'Are you sure you want to sign out?' }),
      confirmText: t('settings.signOut', { defaultValue: 'Sign Out' }),
      cancelText: t('common.cancel', { defaultValue: 'Cancel' }),
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await authClient.signOut();
          await SecureStore.deleteItemAsync('money-matters_session_token');
          await SecureStore.deleteItemAsync('money-matters-session-token');
          setActiveSessionToken(null);
          router.replace('/(auth)/sign-in' as never);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const tabs: SegmentTabItem<SettingsTab>[] = useMemo(
    () => [
      { key: 'profile', label: t('settings.tabs.profile', { defaultValue: 'My Details' }) },
      { key: 'household', label: t('settings.tabs.household', { defaultValue: 'Household' }) },
      { key: 'archived', label: t('settings.tabs.archived', { defaultValue: 'Archived Data' }) },
      { key: 'account-data', label: t('settings.tabs.accountData', { defaultValue: 'Data & Subscription' }) },
    ],
    []
  );

  return (
    <View style={{ flex: 1 }}>
      <AppScreenWrapper
        title={t('settings.title', { defaultValue: 'Settings' })}
        infoTooltip={{
          title: t('tooltips.settings.title', { defaultValue: 'About Settings' }),
          content: t('tooltips.settings.content', {
            defaultValue: 'Manage your household profile, preferences, and account configuration.',
          }),
        }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top 4-Tab Segmented Control */}
          <SegmentedTabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          {/* TAB 1: MY DETAILS */}
          {activeTab === 'profile' && (
            <View style={styles.tabSection}>
              {/* User Profile Details & Avatar */}
              <MobileProfileSection />

              {/* App Preferences: Language, Theme, Icons, Biometrics */}
              <PreferencesSection />

              {/* Push Notifications Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t('notifications.settings.title', { defaultValue: 'Notifications' })}
                </Text>
                <TouchableOpacity
                  style={styles.navLink}
                  onPress={() => router.push('/(app)/settings/notifications' as Href)}
                  activeOpacity={0.8}
                >
                  <View style={styles.navLinkLeft}>
                    <Feather name="bell" size={16} color="#2563eb" />
                    <Text style={styles.navLinkText}>
                      {t('settings.notificationsLink', { defaultValue: 'Push Notifications & Reminders' })}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Sign Out Button */}
              <TouchableOpacity
                style={[styles.signOutBtn, loading && { opacity: 0.7 }]}
                onPress={handleSignOut}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={16} color="#E11D48" />
                <Text style={styles.signOutBtnText}>
                  {loading
                    ? t('common.loading', { defaultValue: 'Signing out...' })
                    : t('settings.signOut', { defaultValue: 'Sign Out' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: HOUSEHOLD */}
          {activeTab === 'household' && (
            <View style={styles.tabSection}>
              {/* Active Household Card & Switcher Button */}
              <View style={styles.activeHouseholdCard}>
                <View style={styles.activeHouseholdLeft}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeHouseholdLabel}>{t('tenantSwitcher.label', { defaultValue: 'Active Household' })}</Text>
                    <Text style={styles.activeHouseholdName} numberOfLines={1}>
                      {currentTenant?.name || 'My Household'}
                    </Text>
                    <Text style={styles.activeHouseholdRole}>Role: {currentTenant?.role || 'OWNER'}</Text>
                  </View>
                </View>

                {tenantsList.length > 1 && (
                  <TouchableOpacity
                    onPress={() => setTenantSwitcherVisible(true)}
                    style={styles.switchButton}
                    activeOpacity={0.7}
                  >
                    <Feather name="refresh-cw" size={14} color="#2563eb" />
                    <Text style={styles.switchButtonText}>
                      {t('tenantSwitcher.switchAction', { defaultValue: 'Switch' })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Household Profile & Location Details */}
              <HouseholdDetailsSection />

              {/* Family & Partner Invites */}
              <HouseholdPartnerInviteSection />

              {/* Management & Logs Hub Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('settings.managementTitle', { defaultValue: 'Management & Quick Hub' })}</Text>

                <TouchableOpacity
                  style={styles.navLink}
                  onPress={() => router.push('/(app)/settings/bank-accounts' as Href)}
                  activeOpacity={0.8}
                >
                  <View style={styles.navLinkLeft}>
                    <Feather name="credit-card" size={16} color="#2563eb" />
                    <Text style={styles.navLinkText}>
                      {t('settings.bankAccountsLink', { defaultValue: 'Linked Bank Accounts & Balances' })}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navLink}
                  onPress={() => router.push('/(setup)/income?mode=rerun' as Href)}
                  activeOpacity={0.8}
                >
                  <View style={styles.navLinkLeft}>
                    <Feather name="refresh-cw" size={16} color="#2563eb" />
                    <Text style={styles.navLinkText}>{t('setup.recalibrateTitle', { defaultValue: 'Recalibrate Setup Wizard' })}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navLink}
                  onPress={() => router.push('/(app)/settings/history' as Href)}
                  activeOpacity={0.8}
                >
                  <View style={styles.navLinkLeft}>
                    <Feather name="clock" size={16} color="#2563eb" />
                    <Text style={styles.navLinkText}>
                      {t('settings.allocationHistoryLink', { defaultValue: 'Payday Allocation History' })}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Danger Zone */}
              <HouseholdDangerZoneSection />
            </View>
          )}

          {/* TAB 3: ARCHIVED DATA */}
          {activeTab === 'archived' && (
            <View style={styles.tabSection}>
              <MobileArchivedSection />
            </View>
          )}

          {/* TAB 4: DATA & SUBSCRIPTION */}
          {activeTab === 'account-data' && (
            <View style={styles.tabSection}>
              <SubscriptionPlanSection />

              <PrivacyGovernanceSection />

              {/* Feedback Button */}
              <TouchableOpacity
                style={styles.feedbackBtn}
                onPress={() => setFeedbackVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="message-square" size={16} color="#2563eb" />
                <Text style={styles.feedbackBtnText}>
                  {t('settings.reportBugLink', { defaultValue: 'Provide Feedback' })}
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
            </View>
          )}
        </ScrollView>
      </AppScreenWrapper>

      {/* Household Switcher Modal */}
      <MobileTenantSwitcherModal
        visible={tenantSwitcherVisible}
        onClose={() => setTenantSwitcherVisible(false)}
      />

      {/* Feedback Modal */}
      <FeedbackFormModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  tabSection: {
    gap: 14,
  },
  activeHouseholdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  activeHouseholdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  householdIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeHouseholdLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeHouseholdName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  activeHouseholdRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  navLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  navLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
});
