"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { InfoTooltip, Tabs, ConfirmDialog, useToast } from "@money-matters/ui/web";
import { authClient } from "../../../lib/auth";
import posthog from "../../../lib/posthog-client";
import { trpc } from "../../../lib/trpc";
import { getWebVersionInfo } from "../../../lib/version";
import { FeedbackModal } from "../../../components/web/FeedbackModal";

import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";
import { ProfileSection } from "./components/ProfileSection";
import { SubscriptionSection } from "./components/SubscriptionSection";
import { PartnerInviteSection } from "./components/PartnerInviteSection";
import { HouseholdDetailsSection } from "./components/HouseholdDetailsSection";
import { HouseholdDangerZoneSection } from "./components/HouseholdDangerZoneSection";
import { BankAccountsSection } from "./components/BankAccountsSection";
import { ArchivedSection } from "./components/ArchivedSection";
import { PrivacySection } from "./components/PrivacySection";

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const { status } = useSubscriptionStatus();
  const currentTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(status?.isTrialExpired ? "account-data" : currentTab);

  const toast = useToast();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [isHouseholdDirty, setIsHouseholdDirty] = useState(false);
  const discardProfileRef = React.useRef<(() => void) | null>(null);
  const discardHouseholdRef = React.useRef<(() => void) | null>(null);

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const currentTimezone = userPrefQuery.data?.timezone || "Australia/Sydney";

  React.useEffect(() => {
    if (status?.isTrialExpired) {
      if (activeTab !== "account-data") {
        setActiveTab("account-data");
      }
    } else if (currentTab !== activeTab && !isProfileDirty && !isHouseholdDirty) {
      setActiveTab(currentTab);
    }
  }, [status?.isTrialExpired, currentTab, activeTab, isProfileDirty, isHouseholdDirty]);

  const handleTabChange = (tabId: string) => {
    if (status?.isTrialExpired && tabId !== "account-data") {
      return;
    }
    if (tabId === activeTab) return;

    if (activeTab === "profile" && isProfileDirty) {
      setPendingTab(tabId);
      setShowDiscardConfirm(true);
      return;
    }

    if (activeTab === "household" && isHouseholdDirty) {
      setPendingTab(tabId);
      setShowDiscardConfirm(true);
      return;
    }

    setActiveTab(tabId);
    window.history.replaceState(null, "", `/dashboard/settings?tab=${tabId}`);
  };

  const handleConfirmDiscard = () => {
    if (activeTab === "profile" && discardProfileRef.current) {
      discardProfileRef.current();
    } else if (activeTab === "household" && discardHouseholdRef.current) {
      discardHouseholdRef.current();
    }
    setShowDiscardConfirm(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      window.history.replaceState(null, "", `/dashboard/settings?tab=${pendingTab}`);
      setPendingTab(null);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const versionInfo = getWebVersionInfo();

  const handleCopyDiagnostics = () => {
    navigator.clipboard.writeText(JSON.stringify(versionInfo, null, 2));
    toast.success(t("toasts.copied"));
  };

  const tabsList = [
    { id: "profile", label: t("settings.tabs.profile") || "My Details" },
    { id: "household", label: t("settings.tabs.household") || "Household" },
    { id: "bank-accounts", label: t("settings.tabs.bankAccounts") || "Bank Accounts" },
    { id: "archived", label: t("settings.tabs.archived") || "Archived Data" },
    { id: "account-data", label: t("settings.tabs.accountData") || "Data & Subscription" },
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
      <div className={activeTab === "profile" ? "space-y-6" : "hidden"}>
        <ProfileSection
          user={session?.user}
          currentTimezone={currentTimezone}
          onDirtyChange={setIsProfileDirty}
          registerDiscard={(fn) => {
            discardProfileRef.current = fn;
          }}
        />
      </div>

      <div className={activeTab === "household" ? "space-y-6" : "hidden"}>
        <HouseholdDetailsSection
          onDirtyChange={setIsHouseholdDirty}
          registerDiscard={(fn) => {
            discardHouseholdRef.current = fn;
          }}
        />
        <PartnerInviteSection />
        <HouseholdDangerZoneSection />
      </div>

      <div className={activeTab === "bank-accounts" ? "space-y-6" : "hidden"}>
        <BankAccountsSection />
      </div>

      <div className={activeTab === "archived" ? "space-y-6" : "hidden"}>
        <ArchivedSection />
      </div>

      <div className={activeTab === "account-data" ? "space-y-6" : "hidden"}>
        <SubscriptionSection status={status} />
        <PrivacySection />
      </div>

      {/* Feedback & Version Section */}
      <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setFeedbackVisible(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400 transition-all shadow-xs"
        >
          {t("settings.reportBugLink")}
        </button>

        <button
          type="button"
          onClick={handleCopyDiagnostics}
          className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 transition-colors"
          title={t("settings.versionInfo.copyDiagnosticsHint")}
        >
          Money Matters {versionInfo.formattedVersion} • {versionInfo.channel} channel
        </button>
      </div>

      <FeedbackModal
        isOpen={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        userEmail={session?.user?.email || ""}
      />

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title={t("modals.discardChanges.title")}
        description={t("modals.discardChanges.description")}
        confirmLabel={t("modals.discardChanges.discard")}
        cancelLabel={t("modals.discardChanges.cancel")}
        variant="danger"
        onConfirm={handleConfirmDiscard}
        onClose={() => {
          setShowDiscardConfirm(false);
          setPendingTab(null);
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">{t("settings.loadingSettings")}</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
