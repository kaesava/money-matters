"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import posthog from "../../../lib/posthog-client";
import { trpc } from "../../../lib/trpc";
import { Spinner, useIconVisibility } from "@money-matters/ui";

/** Settings page — profile info, manage links, sign out */
export default function SettingsPage() {
  const router = useRouter();
  const { showIcons, setShowIcons } = useIconVisibility();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const currentTimezone = userPrefQuery.data?.timezone || "Australia/Sydney";

  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });

  const handleDownloadData = async () => {
    const { data } = await exportQuery.refetch();
    if (data) {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `money-matters-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
        {t("settings.title")}
      </h1>

      {/* Profile card */}
      {session?.user && (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
            {t("settings.profile", { defaultValue: "Profile" })}
          </p>
          <div
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
              style={{ backgroundColor: "var(--dash-teal)" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--dash-text)" }}>
                {session.user.name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--dash-muted)" }}>
                {session.user.email}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Subscription Card */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          Subscription & Plan
        </p>
        <div
          className="p-4 rounded-xl flex flex-col gap-3"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500">Current Plan</p>
              <p className="text-base font-extrabold text-[#1B2B4B] mt-0.5">
                {userPrefQuery.data ? "Household Plan (Trial / Active)" : "Free Plan"}
              </p>
            </div>
            <button
              onClick={() => router.push("/subscription/upgrade")}
              className="px-3 py-1.5 bg-[#2563eb] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Upgrade / Manage
            </button>
          </div>
        </div>
      </section>

      {/* User Preferences & Aesthetic Card */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          UI Aesthetic & Preferences
        </p>
        <div
          className="p-4 rounded-xl flex flex-col gap-4"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {/* Show Icons Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-800">Show Decorative Icons</p>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Toggle between iconified vs ultra-clean minimalist typographic UI views.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const currentBlob = userPrefQuery.data?.appPreferences?.["01908bde-34bb-7b19-a178-574211bc93aa"] || {};
                const nextShow = !(currentBlob.show_icons ?? true);
                setShowIcons(nextShow);
                updateUserPrefMut.mutate({
                  appPreferences: {
                    ["01908bde-34bb-7b19-a178-574211bc93aa"]: {
                      ...currentBlob,
                      show_icons: nextShow,
                    },
                  },
                });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showIcons ? "bg-[#00B4A6]" : "bg-zinc-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showIcons ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-zinc-100 pt-3 flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-700">{t("settings.language")}</label>
            <select
              value={(userPrefQuery.data?.appPreferences?.["01908bde-34bb-7b19-a178-574211bc93aa"] as { locale?: string } | undefined)?.locale || "en"}
              onChange={(e) => {
                const nextLang = e.target.value as "en" | "ja";
                const currentBlob = userPrefQuery.data?.appPreferences?.["01908bde-34bb-7b19-a178-574211bc93aa"] || {};
                updateUserPrefMut.mutate({
                  appPreferences: {
                    ["01908bde-34bb-7b19-a178-574211bc93aa"]: {
                      ...currentBlob,
                      locale: nextLang,
                    },
                  },
                });
                window.location.reload();
              }}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            >
              <option value="en">English (Australia)</option>
              <option value="ja">日本語 (Japanese)</option>
            </select>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {t("settings.languageHint")}
            </p>
          </div>

          <div className="border-t border-zinc-100 pt-3 flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-700">{t("settings.items.timezone")}</label>
            <select
              value={currentTimezone}
              onChange={(e) => updateUserPrefMut.mutate({ timezone: e.target.value })}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            >
              <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              <option value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</option>
              <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
              <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
              <option value="Australia/Perth">Australia/Perth (AWST)</option>
              <option value="Pacific/Auckland">Pacific/Auckland (NZST)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="UTC">Coordinated Universal Time (UTC)</option>
            </select>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {t("settings.items.timezoneHint")}
            </p>
          </div>
        </div>
      </section>

      {/* Group 1: Your Budget */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          {t("settings.groups.yourBudget")}
        </p>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {[
            { label: t("settings.items.rerunSetup"), id: "settings-resetup-link", onClick: () => router.push("/setup?mode=rerun") },
            { label: t("settings.items.incomePay"), id: "settings-income-link", onClick: () => router.push("/dashboard/paychecks") },
            { label: t("settings.items.bankAccounts"), id: "settings-bank-link", onClick: () => router.push("/dashboard/settings/bank-accounts") },
          ].map((item, i, arr) => (
            <div key={item.id}>
              <button
                id={item.id}
                onClick={item.onClick}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: "var(--dash-text)" }}
              >
                {item.label}
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {i < arr.length - 1 && <div style={{ height: "1px", backgroundColor: "var(--dash-border)", marginLeft: "1rem" }} />}
            </div>
          ))}
        </div>
      </section>

      {/* Group 2: Account & Billing */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          {t("settings.groups.accountBilling")}
        </p>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {/* Subscription link */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100">
            <div>
              <p className="text-xs font-bold text-zinc-800">{t("settings.items.subscription")}</p>
              <p className="text-[11px] text-zinc-500">
                {userPrefQuery.data ? "Household Plan" : "Free Plan"}
              </p>
            </div>
            <button
              onClick={() => router.push("/subscription/upgrade")}
              className="px-3 py-1 bg-[#2563eb] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Manage
            </button>
          </div>

          {[
            { label: t("settings.items.history"), id: "settings-history-link", onClick: () => router.push("/dashboard/settings/history") },
            { label: t("settings.items.notifications"), id: "settings-notifications-link", onClick: () => router.push("/dashboard/settings/notifications") },
          ].map((item, i, arr) => (
            <div key={item.id}>
              <button
                id={item.id}
                onClick={item.onClick}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: "var(--dash-text)" }}
              >
                {item.label}
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {i < arr.length - 1 && <div style={{ height: "1px", backgroundColor: "var(--dash-border)", marginLeft: "1rem" }} />}
            </div>
          ))}
        </div>
      </section>

      {/* Group 3: Preferences */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          {t("settings.groups.preferences")}
        </p>
        <div
          className="p-4 rounded-xl flex flex-col gap-4"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {/* Show Icons Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-800">{t("settings.items.showIcons")}</p>
              <p className="text-[11px] text-zinc-500 leading-normal">
                {t("settings.items.showIconsHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const currentBlob = userPrefQuery.data?.appPreferences?.["01908bde-34bb-7b19-a178-574211bc93aa"] || {};
                const nextShow = !(currentBlob.show_icons ?? true);
                setShowIcons(nextShow);
                updateUserPrefMut.mutate({
                  appPreferences: {
                    ["01908bde-34bb-7b19-a178-574211bc93aa"]: {
                      ...currentBlob,
                      show_icons: nextShow,
                    },
                  },
                });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showIcons ? "bg-[#00B4A6]" : "bg-zinc-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showIcons ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-zinc-100 pt-3 flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-700">{t("settings.items.timezone")}</label>
            <select
              value={currentTimezone}
              onChange={(e) => updateUserPrefMut.mutate({ timezone: e.target.value })}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            >
              <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              <option value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</option>
              <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
              <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
              <option value="Australia/Perth">Australia/Perth (AWST)</option>
              <option value="Pacific/Auckland">Pacific/Auckland (NZST)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="UTC">Coordinated Universal Time (UTC)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Group 4: Danger Zone */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
          {t("settings.groups.dangerZone")}
        </p>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {[
            { label: t("settings.items.archived"), id: "settings-archived-link", onClick: () => router.push("/dashboard/settings/archived") },
            { label: t("settings.items.downloadData"), id: "settings-download-data-link", onClick: handleDownloadData },
            { label: t("settings.items.privacy"), id: "settings-deletion-link", onClick: () => router.push("/privacy/delete-account") },
          ].map((item, i, arr) => (
            <div key={item.id}>
              <button
                id={item.id}
                onClick={item.onClick}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: "var(--dash-text)" }}
              >
                {item.label}
                {item.id === "settings-download-data-link" && exportQuery.isFetching ? (
                  <Spinner size="sm" className="text-[#00B4A6]" />
                ) : (
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              {i < arr.length - 1 && <div style={{ height: "1px", backgroundColor: "var(--dash-border)", marginLeft: "1rem" }} />}
            </div>
          ))}
        </div>
      </section>

      {/* Version */}
      <p className="text-xs text-center text-zinc-400">
        {t("settings.version", { version: "1.0.0" })}
      </p>

      {/* Sign out */}
      <button
        id="settings-sign-out-btn"
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-red-50 text-rose-600 border-rose-200 bg-transparent"
      >
        {t("settings.signOut")}
      </button>
    </div>
  );
}
