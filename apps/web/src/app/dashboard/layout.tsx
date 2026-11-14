"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { t, setLanguage } from "@money-matters/i18n";
import { authClient } from "../../lib/auth";
import posthog from "../../lib/posthog-client";

import { TrialBanner } from "../../components/TrialBanner";
import { useSubscriptionStatus } from "../../hooks/useSubscriptionStatus";
import { useAppFeatures } from "../../hooks/useAppFeatures";
import { Spinner } from "@money-matters/ui/web";
import { useNetworkStatus } from "../../providers/AppProviders";
import type { QuickActionInitialData } from "@money-matters/types";
import { trpc } from "../../lib/trpc";
import { SidebarContent } from "./components/SidebarContent";
import { DashboardDesktopSidebar } from "./components/DashboardDesktopSidebar";
import { DashboardMobileDrawer } from "./components/DashboardMobileDrawer";
import { DashboardMobileHeader } from "./components/DashboardMobileHeader";
import { DashboardQueryErrorFallback } from "./components/DashboardQueryErrorFallback";
import { DashboardFooter } from "./components/DashboardFooter";
import { DashboardLayoutModals } from "./components/DashboardLayoutModals";
import { useDashboardSearchAndShortcuts } from "./components/useDashboardSearchAndShortcuts";
import { NAV_ITEMS } from "./components/navItems";
import { getWebVersionInfo } from "../../lib/version";
import { ProductTourProvider } from "../../providers/ProductTourContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const utils = trpc.useUtils();
  const { isGlobalError, clearGlobalError, lastErrorMessage } = useNetworkStatus();
  const { data: session, isPending } = authClient.useSession();
  const { hasAiAssistant, hasSimulation, hasReports } = useAppFeatures();
  const [isExchanging, setIsExchanging] = useState(false);

  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
  });
  const hasTenant = tenantStatusQuery.data?.hasTenant ?? false;
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
    retry: false,
  });
  const userProfileQuery = trpc.getUserProfile.useQuery(undefined, { enabled: !!session?.user });
  const envelopesQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: !!session?.user && hasTenant });
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: !!session?.user && hasTenant, staleTime: 30_000 });
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, { enabled: !!session?.user && hasTenant, staleTime: 30_000 });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: !!session?.user && hasTenant, staleTime: 30_000 });
  const tenantsQuery = trpc.listUserTenants.useQuery(undefined, { enabled: !!session?.user });
  const { status: subStatus, isLoading: isSubLoading } = useSubscriptionStatus();

  const burstUpcomingEvents = trpc.burstUpcomingEvents.useMutation();
  const lastBurstTenantId = React.useRef<string | null>(null);

  // Auto-burst rolling window of scheduled bills and income on authenticated tenant entry
  useEffect(() => {
    const activeTenantId = tenantStatusQuery.data?.tenantId;
    const hasWriteAccess =
      !!subStatus &&
      !subStatus.isTrialExpired &&
      !subStatus.isGracePeriod &&
      !subStatus.isPastDue &&
      !subStatus.isDeactivated;
    if (
      session?.user &&
      hasTenant &&
      activeTenantId &&
      !isSubLoading &&
      hasWriteAccess &&
      lastBurstTenantId.current !== activeTenantId
    ) {
      lastBurstTenantId.current = activeTenantId;
      burstUpcomingEvents.mutate(undefined, {
        onSuccess: (res) => {
          if (res?.newEventsCount && res.newEventsCount > 0) {
            utils.listIncomeEvents.invalidate();
            utils.listExpenseEvents.invalidate();
            utils.listEnvelopes.invalidate();
            utils.listBankAccountsWithExpected.invalidate();
          }
        },
      });
    }
  }, [session?.user, hasTenant, tenantStatusQuery.data?.tenantId, isSubLoading, subStatus, burstUpcomingEvents, utils]);

  // Expired Trial Guard: redirect to /dashboard/settings?tab=subscription when trial has ended
  useEffect(() => {
    if (!isSubLoading && subStatus?.isTrialExpired) {
      const isAlreadyOnAccountData =
        pathname === "/dashboard/settings" &&
        (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "account-data");
      if (!isAlreadyOnAccountData) {
        router.replace("/dashboard/settings?tab=subscription");
      }
    }
  }, [isSubLoading, subStatus, pathname, router]);

  const hasMultipleTenants = (tenantsQuery.data?.length ?? 0) > 1;

  const userLocale = userPrefQuery.data?.language || "en";

  useEffect(() => {
    if (userLocale) {
      setLanguage(userLocale);
    }
  }, [userLocale]);


  // Setup Guard: redirect to /setup if setup is pending
  useEffect(() => {
    if (isPending || !session?.user || tenantStatusQuery.isLoading) return;

    if (tenantStatusQuery.data) {
      if (!tenantStatusQuery.data.setupCompleted && !pathname.startsWith("/setup")) {
        router.replace("/setup");
      }
    }
  }, [isPending, session, tenantStatusQuery.isLoading, tenantStatusQuery.data, pathname, router]);

  // Exchange neon_auth_session_verifier for session token cookie
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifier = params.get("neon_auth_session_verifier");
    if (verifier) {
      setIsExchanging(true);
      fetch(`/api/auth/get-session?neon_auth_session_verifier=${verifier}`)
        .then(() => {
          
          // Clear verifier from query string and reload to /dashboard with cookie in place
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("neon_auth_session_verifier");
          window.location.href = newUrl.pathname;
        })
        .catch(() => {
        })
        .finally(() => {
          setIsExchanging(false);
        });
    }
  }, []);
  
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem("sidebar_collapsed") === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage access error
    }
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [quickExpenseData, setQuickExpenseData] = useState<QuickActionInitialData | undefined>(undefined);
  const [askPennyOpen, setAskPennyOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const askMutation = trpc.assistantAsk.useMutation();
  const usageQuery = trpc.assistantUsage.useQuery(undefined, {
    enabled: !!session?.user && hasTenant && hasAiAssistant,
    staleTime: 30_000,
  });

  const versionInfo = getWebVersionInfo();

  const { searchPages, searchAccounts, searchEnvelopes, searchEvents, handleSearchTransactions } =
    useDashboardSearchAndShortcuts({
      bankAccountsData: bankAccountsQuery.data,
      envelopesData: envelopesQuery.data,
      incomeEventsData: incomeEventsQuery.data,
      expenseEventsData: expenseEventsQuery.data,
      hasSimulation,
      hasReports,
      setAskPennyOpen,
      setShowShortcutsModal,
      setQuickExpenseOpen,
    });

  // Anti-spam cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleRetryConnection = useCallback(async () => {
    if (cooldownSeconds > 0 || isRetrying) return;
    setIsRetrying(true);
    clearGlobalError();
    try {
      await Promise.all([
        envelopesQuery.refetch(),
        tenantsQuery.refetch(),
        userPrefQuery.refetch(),
        userProfileQuery.refetch(),
        utils.invalidate(),
      ]);
    } catch (_e) {
      // Graceful error handling
    } finally {
      setIsRetrying(false);
      setCooldownSeconds(3); // 3s anti-spam throttle
    }
  }, [cooldownSeconds, isRetrying, clearGlobalError, envelopesQuery, tenantsQuery, userPrefQuery, userProfileQuery, utils]);

  const isInitialLoading = (!envelopesQuery.data || !tenantsQuery.data) && (envelopesQuery.isLoading || tenantsQuery.isLoading || userPrefQuery.isLoading);
  const isQueryFetching = isRetrying;
  const isQueryError = (isGlobalError || envelopesQuery.isError || tenantsQuery.isError || userPrefQuery.isError) && !envelopesQuery.data && !tenantsQuery.data;

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  }, [router]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("neon_auth_session_verifier")) {
      return; // Bypassing redirect, wait for exchange
    }
    if (isExchanging) {
      return; // Bypassing redirect, wait for exchange
    }

    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router, isExchanging]);

  const isAuthenticating = mounted && new URLSearchParams(window.location.search).has("neon_auth_session_verifier");

  const navItems = React.useMemo(
    () => NAV_ITEMS.filter((item) => item.key !== "reports" || hasReports),
    [hasReports]
  );

  if (!mounted || isPending || isAuthenticating || isExchanging) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "var(--dash-bg)" }}
      >
        <Spinner size="lg" label={t("dashboard.loading")} direction="col" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const activeItem = navItems.find((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href)
  );

  const avatarUrl = userProfileQuery.data?.avatarUrl || session?.user?.image || null;

  const renderSidebar = () => (
    <SidebarContent
      sidebarCollapsed={sidebarCollapsed}
      hasMultipleTenants={hasMultipleTenants}
      navItems={navItems}
      pathname={pathname}
      setMobileMenuOpen={setMobileMenuOpen}
      sessionUser={session?.user}
      avatarUrl={avatarUrl}
      initials={initials}
      onNavigateToSettings={() => router.push("/dashboard/settings")}
      onSignOut={handleSignOut}
      onOpenAsk={() => setAskPennyOpen(true)}
      hasAiAssistant={hasAiAssistant}
    />
  );

  return (
    <ProductTourProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: "var(--dash-bg)" }}>
        {/* ── Desktop Sidebar ── */}
        <DashboardDesktopSidebar
          sidebarCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => {
            const next = !c;
            localStorage.setItem("sidebar_collapsed", String(next));
            return next;
          })}
        >
          {renderSidebar()}
        </DashboardDesktopSidebar>

        {/* ── Mobile Navigation Drawer ── */}
        <DashboardMobileDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        >
          {renderSidebar()}
        </DashboardMobileDrawer>

        {/* ── Main Layout Wrapper ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner />

          {/* Sticky top headers - Mobile only */}
          <DashboardMobileHeader
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            title={activeItem ? activeItem.label() : t("app.title")}
            onOpenAskPenny={() => setAskPennyOpen(true)}
            hasAiAssistant={hasAiAssistant}
            onNavigateToSettings={() => router.push("/dashboard/settings")}
            avatarUrl={avatarUrl}
            userName={session?.user?.name}
            initials={initials}
          />

          {/* Global Toolbar and Main Worksheets Viewport */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Main workspace */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
              {(isInitialLoading || isQueryFetching) ? (
                <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
                  <Spinner size="lg" label={t("common.loading")} direction="col" />
                </div>
              ) : isQueryError ? (
                <DashboardQueryErrorFallback
                  cooldownSeconds={cooldownSeconds}
                  isRetrying={isRetrying}
                  onRetry={handleRetryConnection}
                  errorMessage={lastErrorMessage || (envelopesQuery.error || tenantsQuery.error || userPrefQuery.error)?.message}
                />
              ) : (
                children
              )}
            </main>

            {/* App-wide Dashboard Legal & Version Footer */}
            <DashboardFooter versionInfo={versionInfo} />
          </div>

          <DashboardLayoutModals
            quickExpenseOpen={quickExpenseOpen}
            setQuickExpenseOpen={setQuickExpenseOpen}
            quickExpenseData={quickExpenseData}
            setQuickExpenseData={setQuickExpenseData}
            showShortcutsModal={showShortcutsModal}
            setShowShortcutsModal={setShowShortcutsModal}
            askPennyOpen={askPennyOpen}
            setAskPennyOpen={setAskPennyOpen}
            hasSimulation={hasSimulation}
            hasAiAssistant={hasAiAssistant}
            searchPages={searchPages}
            searchAccounts={searchAccounts}
            searchEnvelopes={searchEnvelopes}
            searchEvents={searchEvents}
            handleSearchTransactions={handleSearchTransactions}
            remainingCalls={hasAiAssistant && usageQuery.data?.limit && usageQuery.data ? Math.max(0, usageQuery.data.limit - usageQuery.data.used) : undefined}
            onAskPenny={hasAiAssistant ? async (q) => {
              const res = await askMutation.mutateAsync({ query: q });
              usageQuery.refetch();
              return res;
            } : undefined}
          />
        </div>
      </div>
    </ProductTourProvider>
  );
}
