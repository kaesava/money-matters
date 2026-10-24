"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { InfoTooltip, useToast } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";

export default function NotificationSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => {
      toast.error(err.message || t("common.errorTryAgain"));
    },
  });

  const appPrefs = (userPrefQuery.data?.appPreferences || {}) as Record<string, unknown>;
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [paydayAlerts, setPaydayAlerts] = useState(true);
  const [balanceNudge, setBalanceNudge] = useState(true);

  useEffect(() => {
    if (userPrefQuery.data?.appPreferences) {
      const prefs = userPrefQuery.data.appPreferences as Record<string, unknown>;
      setWeeklyDigest(prefs.weekly_digest_enabled !== false);
      setPaydayAlerts(prefs.payday_alerts_enabled !== false);
      setBalanceNudge(prefs.balance_nudge_enabled !== false);
    }
  }, [userPrefQuery.data]);

  const handleToggle = (key: string, value: boolean) => {
    if (key === "weekly_digest_enabled") setWeeklyDigest(value);
    if (key === "payday_alerts_enabled") setPaydayAlerts(value);
    if (key === "balance_nudge_enabled") setBalanceNudge(value);

    updatePrefMutation.mutate({
      appPreferences: {
        "money-matters": {
          ...appPrefs,
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer"
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

      <div className="flex flex-col gap-3">
        {/* Weekly Digest Toggle */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex flex-col gap-1 pr-4">
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
          <input
            type="checkbox"
            checked={weeklyDigest}
            onChange={(e) => handleToggle("weekly_digest_enabled", e.target.checked)}
            className="w-5 h-5 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
          />
        </div>

        {/* Payday Alerts Toggle */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1B2B4B]">{t("notifications.settings.paydayTitle")}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#2563eb]/10 text-[#2563eb]">
                {t("notifications.settings.activeEmailBadge")}
              </span>
            </div>
            <span className="text-xs text-zinc-500">
              {t("notifications.settings.paydayDesc")}
            </span>
          </div>
          <input
            type="checkbox"
            checked={paydayAlerts}
            onChange={(e) => handleToggle("payday_alerts_enabled", e.target.checked)}
            className="w-5 h-5 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
          />
        </div>

        {/* Balance Nudge Toggle */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1B2B4B]">{t("notifications.settings.balanceMatchTitle")}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#2563eb]/10 text-[#2563eb]">
                {t("notifications.settings.activeEmailBadge")}
              </span>
            </div>
            <span className="text-xs text-zinc-500">
              {t("notifications.settings.balanceMatchDesc")}
            </span>
          </div>
          <input
            type="checkbox"
            checked={balanceNudge}
            onChange={(e) => handleToggle("balance_nudge_enabled", e.target.checked)}
            className="w-5 h-5 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
