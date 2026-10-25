import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { SegmentedTabs, DESIGN_TOKENS, showMobileConfirm, useMobileToast } from '@money-matters/ui/mobile';
import { authClient } from '../../lib/auth';
import { setActiveSessionToken, setActiveTenantId, trpc } from '../../lib/trpc';
import * as SecureStore from 'expo-secure-store';

import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { MobileProfileSection } from '../../components/settings/MobileProfileSection';
import { HouseholdDetailsSection } from '../../components/settings/HouseholdDetailsSection';
import { HouseholdPartnerInviteSection } from '../../components/settings/HouseholdPartnerInviteSection';
import { SubscriptionPlanSection } from '../../components/settings/SubscriptionPlanSection';
import { PrivacyGovernanceSection } from '../../components/settings/PrivacyGovernanceSection';
import { HouseholdDangerZoneSection } from '../../components/settings/HouseholdDangerZoneSection';
import { FeedbackFormModal } from '../../components/FeedbackFormModal';
import { MobileTenantSwitcherModal } from '../../components/settings/MobileTenantSwitcherModal';
import { MobileBankAccountsSection } from '../../components/settings/MobileBankAccountsSection';
import { MobileArchivedSection } from '../../components/settings/MobileArchivedSection';
import { getMobileVersionInfo } from '../../lib/version';
import { useMobileProductTour } from '../../context/ProductTourContext';

import { SettingsNotificationsCard } from '../../components/settings/layout/SettingsNotificationsCard';
import { SettingsActiveHouseholdCard } from '../../components/settings/layout/SettingsActiveHouseholdCard';
import { SettingsVersionFooter } from '../../components/settings/layout/SettingsVersionFooter';
import { useSettingsTabManagement, SettingsTab } from '../../components/settings/layout/useSettingsTabManagement';

export type { SettingsTab };

export default function SettingsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { startTour } = useMobileProductTour();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const {
    activeTab,
    tabs,
    handleTabChange,
    setIsProfileDirty,
    setIsHouseholdDirty,
    discardProfileRef,
    discardHouseholdRef,
    returnTo,
  } = useSettingsTabManagement();

  const [loading, setLoading] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [tenantSwitcherVisible, setTenantSwitcherVisible] = useState(false);

  const { data: tenants } = trpc.listUserTenants.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const tenantsList = tenants ?? [];
  const currentTenant = tenantsList.find((t) => t.isCurrent) || tenantsList[0];

  const handleCopyDiagnostics = () => {
    const versionInfo = getMobileVersionInfo();
    const jsonStr = JSON.stringify(versionInfo, null, 2);
    toast.info(jsonStr, t('settings.app.diagnosticsCopied'));
  };

  const removeToken = trpc.removeToken.useMutation();

  const handleSignOut = async () => {
    showMobileConfirm({
      title: t('settings.signOut'),
      message: t('settings.signOutConfirm'),
      confirmText: t('settings.signOut'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const cachedToken = await SecureStore.getItemAsync('push_device_token').catch(() => null);
          if (cachedToken) {
            await removeToken.mutateAsync({ platform: 'android', token: cachedToken }).catch(() => {});
            await SecureStore.deleteItemAsync('push_device_token').catch(() => {});
          }
          await authClient.signOut();
          await SecureStore.deleteItemAsync('money-matters_session_token');
          await SecureStore.deleteItemAsync('money-matters-session-token');
          await SecureStore.deleteItemAsync('money_matters_active_tenant_id').catch(() => {});
          setActiveSessionToken(null);
          setActiveTenantId(null);
          await utils.invalidate().catch(() => {});
          router.replace('/(auth)/sign-in' as Href);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppScreenWrapper
        title={t('settings.title')}
        showBack={Boolean(returnTo)}
        onBackPress={() => {
          if (returnTo) {
            router.push(returnTo as Href);
          } else {
            router.back();
          }
        }}
        infoTooltip={{
          title: t('tooltips.settings.title'),
          content: t('tooltips.settings.content'),
        }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top 5-Tab Segmented Control (Full Width) */}
          <View style={styles.tabsWrapper}>
            <SegmentedTabs
              tabs={tabs}
              activeKey={activeTab}
              onChange={handleTabChange}
              scrollable={true}
              style={styles.segmentedTabs}
            />
          </View>

          {/* TAB 1: MY DETAILS */}
          {activeTab === 'profile' && (
            <View style={styles.tabSection}>
              <MobileProfileSection
                onDirtyChange={setIsProfileDirty}
                registerDiscard={(fn) => {
                  discardProfileRef.current = fn;
                }}
              />

              <SettingsNotificationsCard />
            </View>
          )}

          {/* TAB 2: HOUSEHOLD */}
          {activeTab === 'household' && (
            <View style={styles.tabSection}>
              <SettingsActiveHouseholdCard
                currentTenant={currentTenant}
                showSwitcher={tenantsList.length > 1}
                onOpenSwitcher={() => setTenantSwitcherVisible(true)}
              />

              <HouseholdDetailsSection
                onDirtyChange={setIsHouseholdDirty}
                registerDiscard={(fn) => {
                  discardHouseholdRef.current = fn;
                }}
              />

              <HouseholdPartnerInviteSection />

              <HouseholdDangerZoneSection />
            </View>
          )}

          {/* TAB 3: BANK ACCOUNTS */}
          {activeTab === 'bank-accounts' && (
            <View style={styles.tabSection}>
              <MobileBankAccountsSection />
            </View>
          )}

          {/* TAB 4: ARCHIVED DATA */}
          {activeTab === 'archived' && (
            <View style={styles.tabSection}>
              <MobileArchivedSection />
            </View>
          )}

          {/* TAB 5: DATA & SUBSCRIPTION */}
          {activeTab === 'account-data' && (
            <View style={styles.tabSection}>
              <SubscriptionPlanSection />

              <PrivacyGovernanceSection />
            </View>
          )}

          {/* Help & Support Section */}
          <View style={styles.helpSection}>
            <TouchableOpacity
              style={styles.helpRowBtn}
              onPress={startTour}
              activeOpacity={0.7}
            >
              <Feather name="help-circle" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
              <Text style={styles.helpRowText}>{t('tour.settings.revisitTour')}</Text>
              <Feather name="chevron-right" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>

            <View style={styles.helpDivider} />

            <TouchableOpacity
              style={styles.helpRowBtn}
              onPress={() => setFeedbackVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="message-square" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
              <Text style={styles.helpRowText}>{t('settings.reportBugLink')}</Text>
              <Feather name="chevron-right" size={16} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          </View>

          {/* Sign Out CTA */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={16} color={DESIGN_TOKENS.colors.critical} />
            <Text style={styles.signOutButtonText}>{t('settings.signOut')}</Text>
          </TouchableOpacity>

          {/* Inconspicuous Version Footer */}
          <SettingsVersionFooter
            onCopyDiagnostics={handleCopyDiagnostics}
          />
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
  tabsWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  segmentedTabs: {
    marginBottom: 0,
  },
  helpSection: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginTop: 20,
    overflow: 'hidden',
  },
  helpRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  helpRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  helpDivider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    marginLeft: 44,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 13,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.critical,
  },
});
