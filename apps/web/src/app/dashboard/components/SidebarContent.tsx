"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
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
  sessionUser?: { name?: string | null; email?: string | null; image?: string | null } | null;
  avatarUrl?: string | null;
  initials: string;
  onNavigateToSettings: () => void;
  onSignOut: () => void;
}

export function SidebarContent({
  sidebarCollapsed,
  hasMultipleTenants,
  navItems,
  pathname,
  setMobileMenuOpen,
  sessionUser,
  avatarUrl,
  initials,
  onNavigateToSettings,
  onSignOut,
}: SidebarContentProps) {
  const effectiveAvatar = avatarUrl || sessionUser?.image || null;

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
                  backgroundColor: isActive ? "#2563eb" : "transparent",
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

        {/* Free trial / Upgrade item */}
        <div className="pt-4 border-t border-white/10 mt-auto flex flex-col gap-2">
          <SidebarTrialNavItem collapsed={sidebarCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      </nav>

      {/* User profile and prominent sign out section at bottom */}
      <div className="p-3 border-t border-white/10 shrink-0 space-y-2">
        <div
          onClick={onNavigateToSettings}
          className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors group ${sidebarCollapsed ? "justify-center" : ""}`}
          title={t("settings.profile")}
        >
          {effectiveAvatar ? (
            <Image
              unoptimized
              src={effectiveAvatar}
              alt={sessionUser?.name || "User"}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/15 group-hover:ring-[#2563eb] transition-all"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ring-2 ring-white/15 group-hover:ring-[#2563eb] transition-all"
              style={{ backgroundColor: "#2563eb" }}
            >
              {initials}
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-white truncate group-hover:text-blue-300 transition-colors">
                {sessionUser?.name}
              </p>
              <p className="text-[10px] text-[#9EACC7] truncate">{sessionUser?.email}</p>
            </div>
          )}
        </div>

        {/* Prominent Sign Out Button */}
        {!sidebarCollapsed ? (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t("settings.signOut")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignOut}
            title={t("settings.signOut")}
            aria-label={t("settings.signOut")}
            className="w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 transition-all cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
