"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import posthog from "../../../lib/posthog-client";
import { trpc } from "../../../lib/trpc";

import { ProfileSection } from "./components/ProfileSection";
import { SubscriptionSection } from "./components/SubscriptionSection";
import { PartnerInviteSection } from "./components/PartnerInviteSection";
import { PreferencesSection } from "./components/PreferencesSection";
import { PrivacySection } from "./components/PrivacySection";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const currentTimezone = userPrefQuery.data?.timezone || "Australia/Sydney";

  return (
    <div className="flex flex-col gap-6 max-w-lg pb-16 animate-in fade-in duration-200">
      <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
        {t("settings.title")}
      </h1>

      {/* Composable Vertical Slices */}
      <ProfileSection user={session?.user} />
      <SubscriptionSection isTrialOrActive={Boolean(userPrefQuery.data)} />
      <PartnerInviteSection />
      <PreferencesSection currentTimezone={currentTimezone} />

      {/* Management Quick Links */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          Management & Logs
        </p>
        <div
          className="p-4 rounded-xl flex flex-col gap-3 divide-y divide-zinc-100"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          <a
            href="/setup?mode=rerun"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-1 first:pt-0"
          >
            <span>🔄 Re-run Budget Setup & Category Targets</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/bank-accounts"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>🏦 Bank Accounts & Statement Import</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/transactions"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>📜 Transaction History & Itemized Ledger</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/settings/history"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>💸 Payday Allocation History</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/settings/archived"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>📦 Archived Categories & Bills</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/settings/notifications"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>🔔 Notification Preferences</span>
            <span>→</span>
          </a>
        </div>
      </section>

      <PrivacySection />

      {/* Sign Out Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
        >
          {t("settings.signOut", { defaultValue: "Sign Out" })}
        </button>
      </div>
    </div>
  );
}
