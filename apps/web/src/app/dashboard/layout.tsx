"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { t, setLanguage } from "@money-matters/i18n";
import { authClient } from "../../lib/auth";
import posthog from "../../lib/posthog-client";
import { QuickExpenseDrawer } from "../../components/web/QuickExpenseDrawer";

import { TrialBanner } from "../../components/TrialBanner";
import { SidebarTrialNavItem } from "../../components/TrialStatusBadge";
import { TrialEndedModal } from "../../components/TrialEndedModal";
import { CatchUpSweepModal } from "../../components/web/CatchUpSweepModal";
import { IconVisibilityProvider } from "@money-matters/ui";
import { Logo, Spinner } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";

const MONEY_MATTERS_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

const NAV_ITEMS = [
  {
    key: "home",
    label: () => t("nav.home"),
    href: "/dashboard",
    icon: (active: boolean) => (
      <svg className="w-5 h-5 transition-transform group-hover:scale-105" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: "categories",
    label: () => t("nav.myMoney"),
    href: "/dashboard/categories",
    icon: (active: boolean) => (
      <svg className="w-5 h-5 transition-transform group-hover:scale-105" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    key: "paychecks",
    label: () => t("nav.payday"),
    href: "/dashboard/income-and-bills",
    icon: (active: boolean) => (
      <svg className="w-5 h-5 transition-transform group-hover:scale-105" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "bank-accounts",
    label: () => "Accounts",
    href: "/dashboard/bank-accounts",
    icon: (active: boolean) => (
      <svg className="w-5 h-5 transition-transform group-hover:scale-105" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: () => t("nav.settings"),
    href: "/dashboard/settings",
    icon: (active: boolean) => (
      <svg className="w-5 h-5 transition-transform group-hover:scale-105" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, error: sessionError } = authClient.useSession();
  const [isExchanging, setIsExchanging] = useState(false);

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, { enabled: !!session?.user });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });
  const moveMoneyMutation = trpc.moveMoney.useMutation({
    onSuccess: () => {
      categoriesQuery.refetch();
    },
  });

  const initialShowIcons = userPrefQuery.data?.appPreferences?.[MONEY_MATTERS_APP_ID]?.show_icons ?? true;
  const prefs = userPrefQuery.data?.appPreferences?.[MONEY_MATTERS_APP_ID] as { locale?: "en" | "ja" } | undefined;
  const userLocale = prefs?.locale || "en";

  useEffect(() => {
    if (userLocale) {
      setLanguage(userLocale);
    }
  }, [userLocale]);

  // Zero-Categories Guard: redirect to setup wizard if user has 0 categories
  useEffect(() => {
    if (
      !isPending &&
      session?.user &&
      !categoriesQuery.isLoading &&
      categoriesQuery.data &&
      categoriesQuery.data.length === 0 &&
      !pathname.startsWith("/dashboard/setup")
    ) {
      router.replace("/dashboard/setup");
    }
  }, [isPending, session, categoriesQuery.isLoading, categoriesQuery.data, pathname, router]);

  // Exchange neon_auth_session_verifier for session token cookie
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifier = params.get("neon_auth_session_verifier");
    if (verifier) {
      setIsExchanging(true);
      console.log("[Auth Exchange] Exchanging verifier:", verifier);
      fetch(`/api/auth/get-session?neon_auth_session_verifier=${verifier}`)
        .then((res) => {
          console.log("[Auth Exchange] Verifier exchange response status:", res.status);
          
          // Clear verifier from query string and reload to /dashboard with cookie in place
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("neon_auth_session_verifier");
          window.location.href = newUrl.pathname;
        })
        .catch((err) => {
          console.error("[Auth Exchange] Error exchanging verifier:", err);
        })
        .finally(() => {
          setIsExchanging(false);
        });
    }
  }, []);

  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG DashboardLayout] isPending:", isPending, "isExchanging:", isExchanging, "session:", session, "error:", sessionError);
  }
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);

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

  // Keyboard Shortcuts Hook
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore shortcuts if user is typing in form inputs
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

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setQuickExpenseOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("category-search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Logo header */}
      <div className={`h-16 flex items-center px-6 gap-3 border-b border-white/10 shrink-0 ${sidebarCollapsed ? "justify-center" : ""}`}>
        <Logo size="md" />
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between flex-1">
            <span className="text-lg font-extrabold tracking-tight text-white select-none">
              {t("app.title")}
            </span>
          </div>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-4 py-6 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href === "/dashboard/settings"
                ? pathname === "/dashboard/settings" || (pathname.startsWith("/dashboard/settings/") && !pathname.startsWith("/dashboard/settings/bank-accounts"))
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative ${
                  isActive
                    ? "text-white shadow-lg shadow-black/10"
                    : "text-[#9EACC7] hover:text-white hover:bg-white/5"
                }`}
                style={{
                  backgroundColor: isActive ? "var(--dash-teal)" : "transparent",
                }}
                title={sidebarCollapsed ? item.label() : undefined}
              >
                {item.icon(isActive)}
                {!sidebarCollapsed && <span>{item.label()}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-md">
                    {item.label()}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Free trial / Upgrade item at bottom of nav list above user box */}
        <div className="pt-4 border-t border-white/10 mt-auto">
          <SidebarTrialNavItem collapsed={sidebarCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      </nav>

      {/* User profile section at the bottom */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <div
          onClick={() => router.push("/dashboard/settings")}
          className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
          title="View User Profile in Settings"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ring-2 ring-white/15" style={{ backgroundColor: "var(--dash-teal)" }}>
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-white truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-[#9EACC7] truncate">{session?.user?.email}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="text-[10px] font-semibold text-[#9EACC7] hover:text-rose-400 transition-colors mt-1 block text-left"
              >
                {t("settings.signOut")} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <IconVisibilityProvider initialShowIcons={initialShowIcons}>
      <div className="flex min-h-screen" style={{ backgroundColor: "var(--dash-bg)" }}>
        {/* ── Desktop Sidebar (Hidden on mobile) ── */}
        <aside
          style={{ backgroundColor: "var(--dash-navy)" }}
          className={`hidden md:flex flex-col border-r border-white/10 shrink-0 sticky top-0 h-screen transition-all duration-300 z-30 ${sidebarWidthClass}`}
        >
          {renderSidebarContent()}

          {/* Sidebar Collapse Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
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
              {renderSidebarContent()}
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

          {/* Global Quick Action Floating Button (Hidden on Income & Bills, and Bank Accounts pages) */}
          {!pathname.startsWith("/dashboard/income-and-bills") && !pathname.startsWith("/dashboard/bank-accounts") && (
            <button
              id="global-quick-add-btn"
              onClick={() => {
                if (pathname.startsWith("/dashboard/categories")) {
                  window.dispatchEvent(new CustomEvent("open-create-category-modal"));
                } else {
                  setQuickExpenseOpen(true);
                }
              }}
              style={{ backgroundColor: "var(--dash-teal)", boxShadow: "0 6px 20px rgba(0,180,166,0.3)" }}
              className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg group"
              title={pathname.startsWith("/dashboard/categories") ? "Add New Category" : "Quick Record Expense (Shortcut: n)"}
              aria-label={pathname.startsWith("/dashboard/categories") ? "Add Category" : t("transactions.addExpense")}
            >
              <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {quickExpenseOpen && (
            <QuickExpenseDrawer
              onClose={() => setQuickExpenseOpen(false)}
            />
          )}

          {/* Catch-Up Sweep Modal */}
          {(() => {
            const everydayCat = categoriesQuery.data?.find((c) => c.type === "EVERYDAY");
            const surplusCat = categoriesQuery.data?.find((c: Record<string, unknown>) => c.isSurplusTarget === true) || categoriesQuery.data?.find((c) => c.type === "GOAL");
            const leftover = Math.max(0, parseFloat(everydayCat?.currentBalance || "0"));

            if (!everydayCat || !surplusCat || leftover <= 10) return null;

            return (
              <CatchUpSweepModal
                leftoverEverydayBalance={leftover}
                surplusTargetName={surplusCat.name}
                onSweep={async () => {
                  await moveMoneyMutation.mutateAsync({
                    sourceCategoryId: everydayCat.id,
                    destinationCategoryId: surplusCat.id,
                    amount: leftover.toFixed(2),
                  });
                }}
                onKeepInEveryday={() => {}}
              />
            );
          })()}
        </div>
      </div>
    </IconVisibilityProvider>
  );
}
