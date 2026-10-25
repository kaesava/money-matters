"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { InfoTooltip, useToast, Button } from "@money-matters/ui/web";
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

  const sendTestMutation = trpc.sendTestNotification.useMutation({
    onSuccess: () => {
      toast.success(t("notifications.settings.testSuccessToast"));
    },
    onError: (err) => {
      toast.error(err.message || t("common.errorTryAgain"));
    },
  });

  const appPrefs = (userPrefQuery.data?.appPreferences || {}) as Record<string, unknown>;

  const [weeklyDigestEmail, setWeeklyDigestEmail] = useState(true);
  const [weeklyDigestPush, setWeeklyDigestPush] = useState(true);
  const [paydayAlertsEmail, setPaydayAlertsEmail] = useState(true);
  const [paydayAlertsPush, setPaydayAlertsPush] = useState(true);
  const [balanceNudgeEmail, setBalanceNudgeEmail] = useState(true);
  const [balanceNudgePush, setBalanceNudgePush] = useState(true);

  useEffect(() => {
    if (userPrefQuery.data?.appPreferences) {
      const p = userPrefQuery.data.appPreferences as Record<string, unknown>;
      setWeeklyDigestEmail(p.weekly_digest_email !== false && p.weekly_digest_enabled !== false);
      setWeeklyDigestPush(p.weekly_digest_push !== false && p.weekly_digest_enabled !== false);
      setPaydayAlertsEmail(p.payday_alerts_email !== false && p.payday_alerts_enabled !== false);
      setPaydayAlertsPush(p.payday_alerts_push !== false && p.payday_alerts_enabled !== false);
      setBalanceNudgeEmail(p.balance_nudge_email !== false && p.balance_nudge_enabled !== false);
      setBalanceNudgePush(p.balance_nudge_push !== false && p.balance_nudge_enabled !== false);
    }
  }, [userPrefQuery.data]);

  const handleToggle = (key: string, value: boolean) => {
    if (key === "weekly_digest_email") setWeeklyDigestEmail(value);
    if (key === "weekly_digest_push") setWeeklyDigestPush(value);
    if (key === "payday_alerts_email") setPaydayAlertsEmail(value);
    if (key === "payday_alerts_push") setPaydayAlertsPush(value);
    if (key === "balance_nudge_email") setBalanceNudgeEmail(value);
    if (key === "balance_nudge_push") setBalanceNudgePush(value);

    updatePrefMutation.mutate({
      appPreferences: {
        "money-matters": {
          ...appPrefs,
          [key]: value,
        },
      },
    });
  };

  const topics = [
    {
      id: "weekly_digest",
      title: t("notifications.settings.weeklyDigestTitle"),
      desc: t("notifications.settings.weeklyDigestDesc"),
      emailKey: "weekly_digest_email",
      emailVal: weeklyDigestEmail,
      pushKey: "weekly_digest_push",
      pushVal: weeklyDigestPush,
    },
    {
      id: "payday_alerts",
      title: t("notifications.settings.paydayTitle"),
      desc: t("notifications.settings.paydayDesc"),
      emailKey: "payday_alerts_email",
      emailVal: paydayAlertsEmail,
      pushKey: "payday_alerts_push",
      pushVal: paydayAlertsPush,
    },
    {
      id: "balance_nudge",
      title: t("notifications.settings.balanceMatchTitle"),
      desc: t("notifications.settings.balanceMatchDesc"),
      emailKey: "balance_nudge_email",
      emailVal: balanceNudgeEmail,
      pushKey: "balance_nudge_push",
      pushVal: balanceNudgePush,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-xl">
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

      <div className="flex flex-col gap-4">
        {topics.map((topic) => (
          <div key={topic.id} className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-[#1B2B4B]">{topic.title}</span>
              <span className="text-xs text-zinc-500">{topic.desc}</span>
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={topic.emailVal}
                  onChange={(e) => handleToggle(topic.emailKey, e.target.checked)}
                  className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
                />
                <span>{t("notifications.settings.emailChannel")}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={topic.pushVal}
                  onChange={(e) => handleToggle(topic.pushKey, e.target.checked)}
                  className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
                />
                <span>{t("notifications.settings.pushChannel")}</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button
          variant="secondary"
          onClick={() => sendTestMutation.mutate({ channel: "all" })}
          disabled={sendTestMutation.isPending}
          className="text-xs font-bold"
        >
          {sendTestMutation.isPending ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")}
        </Button>
      </div>
    </div>
  );
}

