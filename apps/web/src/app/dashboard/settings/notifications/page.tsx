"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import posthog from "../../../../lib/posthog-client";

export default function NotificationSettingsPage() {
  const router = useRouter();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const pref = userPrefQuery.data;

  const handleToggle = (key: "paydayAlertsEnabled" | "shortfallAlertsEnabled" | "billRemindersEnabled" | "weeklyDigestEnabled", currentValue: boolean) => {
    updateUserPrefMut.mutate(
      { [key]: !currentValue },
      {
        onSuccess: () => {
          posthog.capture("notification_preference_updated", {
            preference: key,
            enabled: !currentValue,
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
        >
          {t("notifications.settings.backCta")}
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#1B2B4B]">{t("notifications.settings.title")}</h1>
          <InfoTooltip
            title={t("tooltips.notifications.title")}
            content={t("tooltips.notifications.content")}
          />
        </div>
      </div>

      {userPrefQuery.isLoading ? (
        <div className="py-8 text-center text-xs font-bold text-zinc-400 animate-pulse">
          {t("notifications.settings.loading")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Weekly Summary Digest - Release 1 Active Email Channel */}
          <div className="p-4 rounded-xl bg-white border-2 border-[#2563eb]/30 flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1B2B4B]">{t("notifications.settings.weeklyDigestTitle")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#2563eb]/10 text-[#2563eb]">
                  {t("notifications.settings.activeEmailBadge")}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {t("notifications.settings.weeklyDigestDesc")}
              </span>
            </div>
            <button
              onClick={() => handleToggle("weeklyDigestEnabled", pref?.weeklyDigestEnabled ?? false)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                pref?.weeklyDigestEnabled ?? false ? "bg-[#2563eb]" : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pref?.weeklyDigestEnabled ?? false ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Payday Alerts - Release 2 Mobile Push */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs opacity-75">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1B2B4B]">{t("notifications.settings.paydayTitle")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                  {t("notifications.settings.release2MobileBadge")}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {t("notifications.settings.paydayDesc")}
              </span>
            </div>
            <button
              onClick={() => handleToggle("paydayAlertsEnabled", pref?.paydayAlertsEnabled ?? true)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                pref?.paydayAlertsEnabled ?? true ? "bg-[#00B4A6]" : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pref?.paydayAlertsEnabled ?? true ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Shortfall Alerts - Release 2 Mobile Push */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs opacity-75">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1B2B4B]">{t("notifications.settings.shortfallTitle")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                  {t("notifications.settings.release2MobileBadge")}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {t("notifications.settings.shortfallDesc")}
              </span>
            </div>
            <button
              onClick={() => handleToggle("shortfallAlertsEnabled", pref?.shortfallAlertsEnabled ?? true)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                pref?.shortfallAlertsEnabled ?? true ? "bg-[#00B4A6]" : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pref?.shortfallAlertsEnabled ?? true ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Bill Reminders - Release 2 Mobile Push */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs opacity-75">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1B2B4B]">{t("notifications.settings.billTitle")}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                  {t("notifications.settings.release2MobileBadge")}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {t("notifications.settings.billDesc")}
              </span>
            </div>
            <button
              onClick={() => handleToggle("billRemindersEnabled", pref?.billRemindersEnabled ?? true)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                pref?.billRemindersEnabled ?? true ? "bg-[#00B4A6]" : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pref?.billRemindersEnabled ?? true ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
