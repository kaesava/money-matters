"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useToast, Button } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";

function resolvePrefsBlob(raw: unknown, appId?: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, unknown>;
  if (appId && map[appId] && typeof map[appId] === "object") return map[appId] as Record<string, unknown>;
  if (map["money-matters"] && typeof map["money-matters"] === "object") return map["money-matters"] as Record<string, unknown>;
  return map;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const channelStatusQuery = trpc.getNotificationChannelStatus.useQuery();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const sendTestMutation = trpc.sendTestNotification.useMutation({
    onSuccess: (res) => {
      toast.success(
        t("notifications.settings.testSuccessWithDetails", {
          email: res.emailRecipient,
          count: String(res.mobilePushDeviceCount),
        })
      );
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const appId = userPrefQuery.data?.appId;
  const savedPrefs = resolvePrefsBlob(userPrefQuery.data?.appPreferences, appId);
  const isEnabled = (key: string, legacyKey: string) =>
    optimistic[key] ?? (savedPrefs[key] !== false && savedPrefs[legacyKey] !== false);

  const handleToggle = (key: string, value: boolean) => {
    if (!appId) return;
    setOptimistic((prev) => ({ ...prev, [key]: value }));
    updatePrefMutation.mutate({ appPreferences: { [appId]: { ...savedPrefs, [key]: value } } });
  };

  const topics = [
    { id: "weekly_digest", title: t("notifications.settings.weeklyDigestTitle"), desc: t("notifications.settings.weeklyDigestDesc"), emailKey: "weekly_digest_email", pushKey: "weekly_digest_push", legacyKey: "weekly_digest_enabled" },
    { id: "payday_alerts", title: t("notifications.settings.paydayTitle"), desc: t("notifications.settings.paydayDesc"), emailKey: "payday_alerts_email", pushKey: "payday_alerts_push", legacyKey: "payday_alerts_enabled" },
    { id: "balance_nudge", title: t("notifications.settings.balanceMatchTitle"), desc: t("notifications.settings.balanceMatchDesc"), emailKey: "balance_nudge_email", pushKey: "balance_nudge_push", legacyKey: "balance_nudge_enabled" },
  ];

  const status = channelStatusQuery.data;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer">
          {t("notifications.settings.backCta")}
        </button>
        <h1 className="text-2xl font-black text-[#1B2B4B]">{t("notifications.settings.title")}</h1>
      </div>

      {status && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-col gap-1">
          <span>{t("notifications.settings.emailChannelNote", { email: status.emailRecipient })}</span>
          <span>{t("notifications.settings.mobilePushNote")}</span>
          <span className="font-semibold text-slate-700">
            {status.mobilePushDeviceCount > 0
              ? t("notifications.settings.pushDeviceStatusCount", { count: String(status.mobilePushDeviceCount) })
              : t("notifications.settings.pushDeviceStatusNone")}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {topics.map((topic) => (
          <div key={topic.id} className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-[#1B2B4B]">{topic.title}</span>
              <span className="text-xs text-zinc-500">{topic.desc}</span>
            </div>
            <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={isEnabled(topic.emailKey, topic.legacyKey)} onChange={(e) => handleToggle(topic.emailKey, e.target.checked)} className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer" />
                <span>{t("notifications.settings.emailChannel")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={isEnabled(topic.pushKey, topic.legacyKey)} onChange={(e) => handleToggle(topic.pushKey, e.target.checked)} className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer" />
                <span>{t("notifications.settings.pushChannel")}</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button variant="secondary" onClick={() => sendTestMutation.mutate({ channel: "all" })} disabled={sendTestMutation.isPending} className="text-xs font-bold">
          {sendTestMutation.isPending ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")}
        </Button>
      </div>
    </div>
  );
}
