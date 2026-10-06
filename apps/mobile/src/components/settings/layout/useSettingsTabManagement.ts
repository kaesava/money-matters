import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { t } from '@money-matters/i18n';
import { SegmentTabItem, showMobileConfirm } from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';

export type SettingsTab = 'profile' | 'household' | 'bank-accounts' | 'archived' | 'account-data';

export function useSettingsTabManagement() {
  const searchParams = useLocalSearchParams<{ tab?: string; returnTo?: string }>();
  const subStatusQuery = trpc.getSubscriptionStatus.useQuery();
  const isTrialExpired = subStatusQuery.data?.status === 'TRIAL_EXPIRED';

  const resolvedTab = (searchParams.tab as SettingsTab) || (isTrialExpired ? 'account-data' : 'profile');
  const [activeTab, setActiveTab] = useState<SettingsTab>(resolvedTab);

  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [isHouseholdDirty, setIsHouseholdDirty] = useState(false);
  const discardProfileRef = useRef<(() => void) | null>(null);
  const discardHouseholdRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isTrialExpired) {
      if (activeTab !== 'account-data') {
        setActiveTab('account-data');
      }
    } else if (
      searchParams.tab &&
      ['profile', 'household', 'bank-accounts', 'archived', 'account-data'].includes(searchParams.tab)
    ) {
      setActiveTab(searchParams.tab as SettingsTab);
    }
  }, [searchParams.tab, isTrialExpired]);

  const handleTabChange = (nextTab: SettingsTab) => {
    if (isTrialExpired && nextTab !== 'account-data') {
      return;
    }
    if (nextTab === activeTab) return;

    if (activeTab === 'profile' && isProfileDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title'),
        message: t('modals.discardChanges.description'),
        confirmText: t('modals.discardChanges.discard'),
        cancelText: t('modals.discardChanges.cancel'),
        isDestructive: true,
        onConfirm: () => {
          discardProfileRef.current?.();
          setActiveTab(nextTab);
        },
      });
      return;
    }

    if (activeTab === 'household' && isHouseholdDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title'),
        message: t('modals.discardChanges.description'),
        confirmText: t('modals.discardChanges.discard'),
        cancelText: t('modals.discardChanges.cancel'),
        isDestructive: true,
        onConfirm: () => {
          discardHouseholdRef.current?.();
          setActiveTab(nextTab);
        },
      });
      return;
    }

    setActiveTab(nextTab);
  };

  const tabs: SegmentTabItem<SettingsTab>[] = useMemo(
    () => [
      { key: 'profile', label: t('settings.tabs.profile') },
      { key: 'household', label: t('settings.tabs.household') },
      { key: 'bank-accounts', label: t('settings.tabs.bankAccounts') },
      { key: 'archived', label: t('settings.tabs.archived') },
      { key: 'account-data', label: t('settings.tabs.accountData') },
    ],
    []
  );

  return {
    activeTab,
    tabs,
    handleTabChange,
    setIsProfileDirty,
    setIsHouseholdDirty,
    discardProfileRef,
    discardHouseholdRef,
    returnTo: searchParams.returnTo,
  };
}
