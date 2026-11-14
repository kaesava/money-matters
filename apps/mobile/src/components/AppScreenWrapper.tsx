import React, { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { MobileScreenWrapper, MobileScreenWrapperProps } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { authClient } from '../lib/auth';
import { unregisterCachedPushToken } from '../lib/push';
import { trpc, setActiveSessionToken, setActiveTenantId } from '../lib/trpc';
import * as SecureStore from 'expo-secure-store';
import { MobileHouseholdSwitcherModal } from './settings/MobileHouseholdSwitcherModal';
import { useCommandPalette } from '../context/CommandPaletteContext';
import { useMobileProductTour } from '../context/ProductTourContext';
import { useAppFeatures } from '../context/useAppFeatures';

export interface AppScreenWrapperProps extends Omit<MobileScreenWrapperProps, 'children'> {
  children: React.ReactNode;
}

export function AppScreenWrapper({
  title,
  infoTooltip,
  user: userProp,
  showProfile = true,
  showBack = false,
  onBackPress,
  onSignOut: onSignOutProp,
  onNavigateHome,
  onNavigateCategories,
  onNavigateSettings,
  onNavigateBankAccounts,
  onNavigateHistory,
  onOpenTenantSwitcher,
  hasMultipleTenants: hasMultipleTenantsProp,
  activeTenantName: activeTenantNameProp,
  onOpenAsk,
  scrollable = true,
  children,
}: AppScreenWrapperProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [tenantSwitcherVisible, setTenantSwitcherVisible] = useState(false);
  const { openCommandPalette } = useCommandPalette();
  const { registerTourTarget } = useMobileProductTour();
  const { hasAiAssistant } = useAppFeatures();

  const { data: tenants } = trpc.listUserTenants.useQuery(undefined, {
    enabled: showProfile && !!session?.user,
    staleTime: 30_000,
  });

  const tenantsList = tenants ?? [];
  const currentTenant = tenantsList.find((t) => t.isCurrent) || tenantsList[0];
  const hasMultipleTenants = hasMultipleTenantsProp ?? tenantsList.length > 1;
  const activeTenantName = activeTenantNameProp ?? currentTenant?.name;
  const user = userProp !== undefined ? userProp : session?.user;

  const removeToken = trpc.removeToken.useMutation();

  const handleSignOut = async () => {
    if (onSignOutProp) {
      onSignOutProp();
      return;
    }
    await unregisterCachedPushToken((input) => removeToken.mutateAsync(input));
    await authClient.signOut();
    await SecureStore.deleteItemAsync('money-matters_session_token');
    await SecureStore.deleteItemAsync('money-matters-session-token');
    await SecureStore.deleteItemAsync('money_matters_active_tenant_id');
    setActiveSessionToken(null);
    setActiveTenantId(null);
    router.replace('/(auth)/sign-in' as Href);
  };

  return (
    <>
      <MobileScreenWrapper
        title={title}
        infoTooltip={infoTooltip}
        user={user}
        showProfile={showProfile}
        showBack={showBack}
        onBackPress={onBackPress || (() => router.back())}
        onNavigateHome={onNavigateHome || (() => router.push('/(app)/home' as Href))}
        onNavigateCategories={onNavigateCategories || (() => router.push('/(app)/envelopes' as Href))}
        onNavigateSettings={onNavigateSettings || (() => router.push('/(app)/settings' as Href))}
        onNavigateBankAccounts={onNavigateBankAccounts || (() => router.push('/(app)/settings?tab=bank-accounts' as Href))}
        onNavigateHistory={onNavigateHistory || (() => router.push('/(app)/history' as Href))}
        onOpenTenantSwitcher={onOpenTenantSwitcher || (() => setTenantSwitcherVisible(true))}
        hasMultipleTenants={hasMultipleTenants}
        activeTenantName={activeTenantName}
        onSignOut={handleSignOut}
        onOpenAsk={onOpenAsk || openCommandPalette}
        askAccessibilityLabel={t(hasAiAssistant ? 'commandPalette.triggerTitle' : 'commandPalette.searchOnlyTitle')}
        onAskTargetLayout={(rect) => registerTourTarget('ask-penny', rect)}
        scrollable={scrollable}
      >
        {children}
      </MobileScreenWrapper>

      <MobileHouseholdSwitcherModal
        visible={tenantSwitcherVisible}
        onClose={() => setTenantSwitcherVisible(false)}
      />
    </>
  );
}

export default AppScreenWrapper;
