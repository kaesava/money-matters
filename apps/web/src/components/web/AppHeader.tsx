"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";

interface User {
  name?: string | null;
  email?: string | null;
}

interface AppHeaderProps {
  user: User | null | undefined;
  onQuickExpense: () => void;
  onSignOut: () => void;
}

/** Sticky top header for the authenticated dashboard. Navy/Teal design tokens. */
export function AppHeader({ user, onQuickExpense, onSignOut }: AppHeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header
      style={{ backgroundColor: "var(--dash-navy)" }}
      className="sticky top-0 z-40 h-14 flex items-center px-4 md:px-6 gap-4 shadow-md"
    >
      {/* Branding */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 shrink-0 group"
        aria-label={t("app.title")}
      >
        <span className="text-xl font-black tracking-tight text-white group-hover:opacity-90 transition-opacity">
          ⬡
        </span>
        <span
          style={{ color: "var(--dash-teal)" }}
          className="text-sm font-bold tracking-tight hidden sm:block"
        >
          {t("app.title")}
        </span>
      </button>

      <div className="flex-1" />

      {/* Quick-add (+) button */}
      <button
        id="quick-add-expense-btn"
        onClick={onQuickExpense}
        style={{ backgroundColor: "var(--dash-teal)" }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
        aria-label={t("transactions.addExpense")}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:block">{t("transactions.addExpense")}</span>
        <span className="sm:hidden">+</span>
      </button>

      {/* User avatar + dropdown */}
      <div className="relative" ref={dropRef}>
        <button
          id="user-avatar-btn"
          onClick={() => setDropdownOpen((o) => !o)}
          style={{ backgroundColor: "var(--dash-teal)" }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity ring-2 ring-white/20"
          aria-label={t("settings.title")}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {initials}
        </button>

        {dropdownOpen && (
          <div
            style={{
              backgroundColor: "var(--dash-surface)",
              border: "1px solid var(--dash-border)",
              boxShadow: "var(--dash-shadow-md)",
            }}
            className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
            role="menu"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--dash-border)" }}>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--dash-text)" }}>
                {user?.name ?? "—"}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--dash-muted)" }}>
                {user?.email ?? ""}
              </p>
            </div>

            <div className="py-1">
              {[
                { label: t("nav.home"), href: "/dashboard" },
                { label: "Timeline", href: "/dashboard/timeline" },
                { label: t("nav.categories"), href: "/dashboard/categories" },
                { label: "Income Sources", href: "/dashboard/paychecks" },
                { label: t("transactions.title", { defaultValue: "Transactions" }), href: "/dashboard/transactions" },
                { label: t("nav.settings"), href: "/dashboard/settings" },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                  style={{ color: "var(--dash-text)" }}
                  role="menuitem"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t py-1" style={{ borderColor: "var(--dash-border)" }}>
              <button
                id="sign-out-btn"
                onClick={() => { setDropdownOpen(false); onSignOut(); }}
                className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-red-50 transition-colors"
                style={{ color: "var(--dash-critical)" }}
                role="menuitem"
              >
                {t("settings.signOut")}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
