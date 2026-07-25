"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";

export default function NotificationSettingsPage() {
  const router = useRouter();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const pref = userPrefQuery.data;

  const handleToggle = (key: "paydayAlertsEnabled" | "shortfallAlertsEnabled" | "billRemindersEnabled" | "weeklyDigestEnabled", currentValue: boolean) => {
    updateUserPrefMut.mutate({
      [key]: !currentValue,
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-black text-[#1B2B4B]">Notification Preferences</h1>
      </div>

      <p className="text-xs text-zinc-500 font-semibold">
        Control how and when you receive push notifications and alerts across your devices.
      </p>

      {userPrefQuery.isLoading ? (
        <div className="py-8 text-center text-xs font-bold text-zinc-400 animate-pulse">
          Loading notification settings...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Payday Alerts */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-[#1B2B4B]">🎉 Payday Split Alerts</span>
              <span className="text-xs text-zinc-500">
                Receive 1-tap allocation alerts on the morning of scheduled paydays.
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

          {/* Shortfall Alerts */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-[#1B2B4B]">⚠️ Shortfall & Overdraw Alerts</span>
              <span className="text-xs text-zinc-500">
                Receive immediate warnings when a bill or transaction takes a category into negative.
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

          {/* Bill Reminders */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-[#1B2B4B]">⚡ Bill Proximity Reminders</span>
              <span className="text-xs text-zinc-500">
                Receive reminders 3 days before upcoming fixed bills (rent, mortgage, utilities).
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

          {/* Weekly Summary Digest */}
          <div className="p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between shadow-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-[#1B2B4B]">📊 Weekly Balance Digest</span>
              <span className="text-xs text-zinc-500">
                Receive a Sunday evening digest of your total saved vs spent and upcoming week&apos;s forecast.
              </span>
            </div>
            <button
              onClick={() => handleToggle("weeklyDigestEnabled", pref?.weeklyDigestEnabled ?? false)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                pref?.weeklyDigestEnabled ?? false ? "bg-[#00B4A6]" : "bg-zinc-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  pref?.weeklyDigestEnabled ?? false ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
