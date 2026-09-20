import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { MobileScreenWrapper, MobileScreenWrapperProps } from '@money-matters/ui/mobile';
import { authClient } from '../lib/auth';
import { trpc, setActiveSessionToken } from '../lib/trpc';
import * as SecureStore from 'expo-secure-store';
import { MobileTenantSwitcherModal } from './settings/MobileTenantSwitcherModal';

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
  scrollable = true,
  children,
}: AppScreenWrapperProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [tenantSwitcherVisible, setTenantSwitcherVisible] = useState(false);

  const { data: tenants } = trpc.listUserTenants.useQuery(undefined, {
    enabled: showProfile && !!session?.user,
    staleTime: 30_000,
  });

  const tenantsList = tenants ?? [];
  const currentTenant = tenantsList.find((t) => t.isCurrent) || tenantsList[0];
  const hasMultipleTenants = hasMultipleTenantsProp ?? tenantsList.length > 1;
  const activeTenantName = activeTenantNameProp ?? currentTenant?.name;
  const user = userProp !== undefined ? userProp : session?.user;

  const handleSignOut = async () => {
    if (onSignOutProp) {
      onSignOutProp();
      return;
    }
    await authClient.signOut();
    await SecureStore.deleteItemAsync('money-matters_session_token');
    await SecureStore.deleteItemAsync('money-matters-session-token');
    setActiveSessionToken(null);
    router.replace('/(auth)/sign-in' as never);
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
        onNavigateHome={onNavigateHome || (() => router.push('/(app)/home' as never))}
        onNavigateCategories={onNavigateCategories || (() => router.push('/(app)/categories' as never))}
        onNavigateSettings={onNavigateSettings || (() => router.push('/(app)/settings' as never))}
        onNavigateBankAccounts={onNavigateBankAccounts || (() => router.push('/(app)/settings/bank-accounts' as never))}
        onNavigateHistory={onNavigateHistory || (() => router.push('/(app)/transactions' as never))}
        onOpenTenantSwitcher={onOpenTenantSwitcher || (() => setTenantSwitcherVisible(true))}
        hasMultipleTenants={hasMultipleTenants}
        activeTenantName={activeTenantName}
        onSignOut={handleSignOut}
        scrollable={scrollable}
      >
        {children}
      </MobileScreenWrapper>

      <MobileTenantSwitcherModal
        visible={tenantSwitcherVisible}
        onClose={() => setTenantSwitcherVisible(false)}
      />
    </>
  );
}

export default AppScreenWrapper;
