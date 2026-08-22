"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import posthog from "../../../lib/posthog-client";
import { trpc } from "../../../lib/trpc";

import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";
import { ProfileSection } from "./components/ProfileSection";
import { SubscriptionSection } from "./components/SubscriptionSection";
import { PartnerInviteSection } from "./components/PartnerInviteSection";
import { PreferencesSection } from "./components/PreferencesSection";
import { PrivacySection } from "./components/PrivacySection";
import { BugReportModal } from "./components/BugReportModal";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { status } = useSubscriptionStatus();
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

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
      <SubscriptionSection status={status} />
      <PartnerInviteSection />
      <PreferencesSection currentTimezone={currentTimezone} />

      {/* Management Quick Links */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          {t("settings.managementTitle")}
        </p>
        <div
          className="p-4 rounded-xl flex flex-col gap-3 divide-y divide-zinc-100"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          <a
            href="/dashboard/bank-accounts"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-1 first:pt-0"
          >
            <span>🏦 {t("settings.bankAccountsLink")}</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/transactions"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>📜 {t("settings.transactionHistoryLink")}</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/settings/history"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>💸 {t("settings.allocationHistoryLink")}</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/settings/archived"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>📦 {t("settings.archivedLink")}</span>
            <span>→</span>
          </a>
          <a
            href="/dashboard/settings/notifications"
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5"
          >
            <span>🔔 {t("settings.notificationsLink")}</span>
            <span>→</span>
          </a>
          <button
            type="button"
            onClick={() => setIsBugReportOpen(true)}
            className="flex items-center justify-between text-xs font-bold text-[#2563eb] hover:underline pt-2.5 w-full text-left"
          >
            <span>🐛 {t("settings.reportBugLink")}</span>
            <span>→</span>
          </button>
        </div>
      </section>

      <PrivacySection />

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />

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
