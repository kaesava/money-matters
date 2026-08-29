"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";
import { SidebarTrialNavItem } from "../../../components/TrialStatusBadge";
import { TenantSwitcher } from "../../../components/TenantSwitcher";

export interface NavItem {
  key: string;
  label: () => string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

export interface SidebarContentProps {
  sidebarCollapsed: boolean;
  hasMultipleTenants: boolean;
  navItems: readonly NavItem[];
  pathname: string;
  setMobileMenuOpen: (open: boolean) => void;
  sessionUser?: { name?: string | null; email?: string | null } | null;
  initials: string;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
  onOpenFeedback?: () => void;
}

export function SidebarContent({
  sidebarCollapsed,
  hasMultipleTenants,
  navItems,
  pathname,
  setMobileMenuOpen,
  sessionUser,
  initials,
  onNavigateToSettings,
  onSignOut,
  onOpenFeedback,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand Logo header */}
      <div className={`h-16 flex items-center px-6 gap-3 border-b border-white/10 shrink-0 ${sidebarCollapsed ? "justify-center" : ""}`}>
        <Logo size="md" />
        {!sidebarCollapsed && (
          <div className="flex flex-col flex-1 justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-white select-none truncate">
                {t("app.title")}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-md">
                BETA
              </span>
            </div>
            <span className="text-[10px] text-blue-200/80 font-medium truncate">
              {t("app.tagline")}
            </span>
          </div>
        )}
      </div>

      {hasMultipleTenants && !sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          <TenantSwitcher />
        </div>
      )}

      {/* Navigation items */}
      <nav className="flex-1 px-4 py-6 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
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

        {/* Free trial / Upgrade item + Feedback CTA at bottom of nav list above user box */}
        <div className="pt-4 border-t border-white/10 mt-auto flex flex-col gap-2">
          {onOpenFeedback && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenFeedback();
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition-all cursor-pointer ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
              title="Provide Beta Feedback / Report Bug"
            >
              <span>💬</span>
              {!sidebarCollapsed && <span>Provide Feedback</span>}
            </button>
          )}
          <SidebarTrialNavItem collapsed={sidebarCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      </nav>

      {/* User profile section at the bottom */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <div
          onClick={onNavigateToSettings}
          className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
          title="View User Profile in Settings"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ring-2 ring-white/15" style={{ backgroundColor: "var(--dash-teal)" }}>
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-white truncate">{sessionUser?.name}</p>
              <p className="text-[10px] text-[#9EACC7] truncate">{sessionUser?.email}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSignOut();
                }}
                className="text-[10px] font-semibold text-[#9EACC7] hover:text-rose-400 transition-colors mt-1 block text-left cursor-pointer"
              >
                {t("settings.signOut")} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
