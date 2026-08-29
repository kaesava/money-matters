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
import { HouseholdDetailsSection } from "./components/HouseholdDetailsSection";
import { HouseholdDangerZoneSection } from "./components/HouseholdDangerZoneSection";
import { ArchivedSection } from "./components/ArchivedSection";
import { PrivacySection } from "./components/PrivacySection";

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: session } = authClient.useSession();
  const { status } = useSubscriptionStatus();

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const currentTimezone = userPrefQuery.data?.timezone || "Australia/Sydney";

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/settings?tab=${tabId}`, { scroll: false });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const tabsList = [
    { id: "profile", label: "My Details" },
    { id: "household", label: "Household" },
    { id: "archived", label: "Archived Data" },
    { id: "account-data", label: "Data & Subscription" },
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

      {/* 4-Tab Bar */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab Panels */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileSection user={session?.user} currentTimezone={currentTimezone} />
        </div>
      )}

      {activeTab === "household" && (
        <div className="space-y-6">
          <HouseholdDetailsSection />
          <PartnerInviteSection />
          <HouseholdDangerZoneSection />
        </div>
      )}

      {activeTab === "archived" && (
        <div className="space-y-6">
          <ArchivedSection />
        </div>
      )}

      {activeTab === "account-data" && (
        <div className="space-y-6">
          <SubscriptionSection status={status} />
          <PrivacySection />
        </div>
      )}
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
