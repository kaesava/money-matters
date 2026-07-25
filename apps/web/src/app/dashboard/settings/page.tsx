"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

/** Settings page — profile info, manage links, sign out */
export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("session_token");
    }
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

      {/* User Preferences & Timezone Card */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          Preferences & Timezone
        </p>
        <div
          className="p-4 rounded-xl flex flex-col gap-3"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-700">Display Timezone</label>
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
              All dates and times are stored in UTC in the database and formatted in your local timezone.
            </p>
          </div>
        </div>
      </section>

      {/* Manage section */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          {t("settings.manage", { defaultValue: "Manage" })}
        </p>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {[
            { label: `🔔 Notification Preferences`, id: "settings-notifications-link", onClick: () => router.push("/dashboard/settings/notifications") },
            { label: `📦 Archived Items`, id: "settings-archived-link", onClick: () => router.push("/dashboard/settings/archived") },
            { label: `🏦 ${t("settings.bankAccounts.title")}`, id: "settings-bank-link", onClick: () => router.push("/dashboard/settings/bank-accounts") },
          ].map((item, i, arr) => (
            <div key={item.id}>
              <button
                id={item.id}
                onClick={item.onClick}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: "var(--dash-text)" }}
              >
                {item.label}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--dash-muted)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {i < arr.length - 1 && <div style={{ height: "1px", backgroundColor: "var(--dash-border)", marginLeft: "1rem" }} />}
            </div>
          ))}
        </div>
      </section>

      {/* Version */}
      <p className="text-xs text-center" style={{ color: "var(--dash-muted)" }}>
        {t("settings.version", { version: "1.0.0" })}
      </p>

      {/* Sign out */}
      <button
        id="settings-sign-out-btn"
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-red-50"
        style={{ color: "var(--dash-critical)", borderColor: "var(--dash-critical)", backgroundColor: "transparent" }}
      >
        {t("settings.signOut")}
      </button>
    </div>
  );
}
