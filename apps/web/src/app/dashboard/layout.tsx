"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { t, setLanguage } from "@money-matters/i18n";
import { authClient } from "../../lib/auth";
import posthog from "../../lib/posthog-client";
import { QuickExpenseDrawer } from "../../components/web/QuickExpenseDrawer";

import { TrialBanner } from "../../components/TrialBanner";
import { TrialEndedModal } from "../../components/TrialEndedModal";
import { IconVisibilityProvider } from "@money-matters/ui";
import { Spinner } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";
import { SidebarContent } from "./components/SidebarContent";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { QuickActionFab } from "./components/QuickActionFab";
import { NAV_ITEMS } from "./components/navItems";

const MONEY_MATTERS_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [isExchanging, setIsExchanging] = useState(false);

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, { enabled: !!session?.user });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });
  const tenantsQuery = trpc.listUserTenants.useQuery(undefined, { enabled: !!session?.user });
  const createTenant = trpc.createTenant.useMutation();

  const hasMultipleTenants = (tenantsQuery.data?.length ?? 0) > 1;

  const initialShowIcons = userPrefQuery.data?.appPreferences?.[MONEY_MATTERS_APP_ID]?.show_icons ?? true;
  const prefs = userPrefQuery.data?.appPreferences?.[MONEY_MATTERS_APP_ID] as { locale?: "en" | "ja" } | undefined;
  const userLocale = prefs?.locale || "en";

  useEffect(() => {
    if (userLocale) {
      setLanguage(userLocale);
    }
  }, [userLocale]);

  // Tenant Creation Guard: if user has 0 tenants (e.g. signed up via Google), create one and redirect to setup
  useEffect(() => {
    if (
      !isPending &&
      session?.user &&
      !tenantsQuery.isLoading &&
      tenantsQuery.data &&
      tenantsQuery.data.length === 0 &&
      !createTenant.isPending &&
      !createTenant.isSuccess
    ) {
      createTenant.mutate({ name: session.user.name || "My Finances" }, {
        onSuccess: () => {
          tenantsQuery.refetch().then(() => {
            router.replace("/setup");
          });
        }
      });
    }
  }, [isPending, session, tenantsQuery.isLoading, tenantsQuery.data, createTenant, router, tenantsQuery]);


  // Zero-Categories Guard: redirect to setup wizard if user has 0 categories and hasn't explicitly cancelled/completed setup
  useEffect(() => {
    const isSkippedOrCompleted =
      Boolean(userPrefQuery.data?.setupCompleted) ||
      (typeof window !== "undefined" && localStorage.getItem("skip_setup_wizard") === "true");
    if (
      !isPending &&
      session?.user &&
      !categoriesQuery.isLoading &&
      categoriesQuery.data &&
      categoriesQuery.data.length === 0 &&
      !isSkippedOrCompleted &&
      !pathname.startsWith("/setup")
    ) {
      router.replace("/setup");
    }
  }, [isPending, session, categoriesQuery.isLoading, categoriesQuery.data, userPrefQuery.data, pathname, router]);

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

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG DashboardLayout] isPending:", isPending, "isExchanging:", isExchanging);
  }
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Unified Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "?") {
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowShortcutsModal(false);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setQuickExpenseOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput =
          document.querySelector<HTMLInputElement>('[data-search-input]') ||
          document.querySelector<HTMLInputElement>('input[type="search"]') ||
          document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const isAuthenticating = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("neon_auth_session_verifier");

  if (!isPending && !session?.user && !isAuthenticating && !isExchanging) {
    return null;
  }

  if (isPending || isAuthenticating || isExchanging) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "var(--dash-bg)" }}
      >
        <Spinner size="lg" label={t("dashboard.loading")} direction="col" />
      </div>
    );
  }

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const activeItem = NAV_ITEMS.find((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href)
  );

  const sidebarWidthClass = sidebarCollapsed ? "w-20" : "w-64";

  const renderSidebar = () => (
    <SidebarContent
      sidebarCollapsed={sidebarCollapsed}
      hasMultipleTenants={hasMultipleTenants}
      navItems={NAV_ITEMS}
      pathname={pathname}
      setMobileMenuOpen={setMobileMenuOpen}
      sessionUser={session?.user}
      initials={initials}
      onNavigateToSettings={() => router.push("/dashboard/settings")}
      onSignOut={handleSignOut}
    />
  );

  return (
    <IconVisibilityProvider initialShowIcons={initialShowIcons}>
      <div className="flex min-h-screen" style={{ backgroundColor: "var(--dash-bg)" }}>
        {/* ── Desktop Sidebar (Hidden on mobile) ── */}
        <aside
          style={{ backgroundColor: "var(--dash-navy)" }}
          className={`hidden md:flex flex-col border-r border-white/10 shrink-0 sticky top-0 h-screen transition-all duration-300 z-30 ${sidebarWidthClass}`}
        >
          {renderSidebar()}

          {/* Sidebar Collapse Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed((c) => {
              const next = !c;
              localStorage.setItem("sidebar_collapsed", String(next));
              return next;
            })}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-transform"
            aria-label="Toggle sidebar"
          >
            <svg
              className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </aside>

        {/* ── Mobile Navigation Drawer ── */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop mask shadow */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            />
            {/* Menu Panel drawer */}
            <div
              style={{ backgroundColor: "var(--dash-navy)" }}
              className="relative w-72 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl transition-transform animate-slide-in"
            >
              {renderSidebar()}
            </div>
          </div>
        )}

        {/* ── Main Layout Wrapper ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner />
          <TrialEndedModal />

          {/* Sticky top headers - Mobile only */}
          <header
            style={{ backgroundColor: "var(--dash-navy)" }}
            className="md:hidden sticky top-0 z-40 h-14 flex items-center px-4 justify-between shadow-md"
          >
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 text-white/80 hover:text-white transition-colors"
              aria-label="Open navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <span className="text-sm font-extrabold text-white">
              {activeItem ? activeItem.label() : t("app.title")}
            </span>

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
              style={{ backgroundColor: "var(--dash-teal)" }}
            >
              {initials}
            </div>
          </header>

          {/* Global Toolbar and Main Worksheets Viewport */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Main workspace */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
              {children}
            </main>
          </div>

          <QuickActionFab
            pathname={pathname}
            onOpenModal={() => setQuickExpenseOpen(true)}
          />

          {quickExpenseOpen && (
            <QuickExpenseDrawer
              initialTab={pathname.startsWith("/dashboard/bank-accounts") ? "CREDIT" : "DEBIT"}
              onClose={() => setQuickExpenseOpen(false)}
            />
          )}

          <KeyboardShortcutsModal
            isOpen={showShortcutsModal}
            onClose={() => setShowShortcutsModal(false)}
          />
        </div>
      </div>
    </IconVisibilityProvider>
  );
}
