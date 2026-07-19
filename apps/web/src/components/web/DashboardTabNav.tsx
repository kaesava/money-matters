"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@money-matters/i18n";

const NAV_ITEMS = [
  {
    key: "home",
    label: () => t("nav.home"),
    href: "/dashboard",
    icon: (active: boolean) => (
      <svg className="w-4 h-4" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: "categories",
    label: () => t("nav.categories"),
    href: "/dashboard/buckets",
    icon: (active: boolean) => (
      <svg className="w-4 h-4" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: () => t("nav.settings"),
    href: "/dashboard/settings",
    icon: (active: boolean) => (
      <svg className="w-4 h-4" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
] as const;

/** Horizontal top tab navigation bar below the AppHeader. */
export function DashboardTabNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        backgroundColor: "var(--dash-surface)",
        borderBottom: "1px solid var(--dash-border)",
      }}
      className="flex items-center gap-1 px-4 md:px-6 overflow-x-auto"
      aria-label={t("nav.dashboardNav", { defaultValue: "Dashboard navigation" })}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.key}
            href={item.href}
            id={`nav-${item.key}`}
            style={{
              color: isActive ? "var(--dash-teal)" : "var(--dash-muted)",
              borderBottomColor: isActive ? "var(--dash-teal)" : "transparent",
            }}
            className="flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors hover:text-[--dash-text] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--dash-teal]"
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon(isActive)}
            {item.label()}
          </Link>
        );
      })}
    </nav>
  );
}
