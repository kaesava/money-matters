"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { InfoTooltip, Tabs } from "@money-matters/ui/web";
import { authClient } from "../../../lib/auth";
import posthog from "../../../lib/posthog-client";
import { trpc } from "../../../lib/trpc";

import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";
import { ProfileSection } from "./components/ProfileSection";
import { SubscriptionSection } from "./components/SubscriptionSection";
import { PartnerInviteSection } from "./components/PartnerInviteSection";
import { PrivacySection } from "./components/PrivacySection";
import { BugReportModal } from "./components/BugReportModal";
import { getWebVersionInfo } from "../../../lib/version";

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: session } = authClient.useSession();
  const { status } = useSubscriptionStatus();
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [copiedVersion, setCopiedVersion] = useState(false);

  const versionInfo = getWebVersionInfo();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const currentTimezone = userPrefQuery.data?.timezone || "Australia/Sydney";

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/settings?tab=${tabId}`, { scroll: false });
  };

  const handleCopyDiagnostics = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(versionInfo, null, 2));
      setCopiedVersion(true);
      setTimeout(() => setCopiedVersion(false), 2500);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const tabsList = [
    { id: "profile", label: t("settings.tabs.profile") },
    { id: "household", label: t("settings.tabs.household") },
    { id: "account-data", label: t("settings.tabs.accountData") },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
            {t("settings.title")}
          </h1>
          <InfoTooltip
            title={t("tooltips.settings.title")}
            content={t("tooltips.settings.content")}
          />
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
        >
          {t("settings.signOut")}
        </button>
      </div>

      {/* 3-Tab Bar */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab Panels */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileSection user={session?.user} currentTimezone={currentTimezone} />
        </div>
      )}

      {activeTab === "household" && (
        <div className="space-y-6">
          <PartnerInviteSection />
        </div>
      )}

      {activeTab === "account-data" && (
        <div className="space-y-6">
          <SubscriptionSection status={status} />
          <PrivacySection onOpenBugReport={() => setIsBugReportOpen(true)} />
        </div>
      )}

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />

      {/* App Version Footer */}
      <footer className="pt-8 text-center border-t border-slate-200">
        <button
          type="button"
          onClick={handleCopyDiagnostics}
          title="Click to copy environment diagnostics JSON"
          className="text-[11px] font-medium transition-colors text-slate-400 hover:text-slate-700 select-none cursor-pointer"
        >
          {copiedVersion ? (
            <span className="text-emerald-600 font-bold">✓ Copied version diagnostics</span>
          ) : (
            <span>
              Money Matters {versionInfo.formattedVersion} • {versionInfo.channel} channel
            </span>
          )}
        </button>
      </footer>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading settings...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
