"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { t } from "@money-matters/i18n";

export function TrialBanner() {
  const router = useRouter();
  const { status, isLoading } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !status || status.isSubscribed || dismissed) {
    return null;
  }

  // Show banner only for days 21–30, trial grace, or past due
  const days = status.daysRemainingInTrial ?? 30;
  const showForTrial = status.isTrialActive && days <= 10;
  const showForGrace = status.isTrialGrace;
  const showForPastDue = status.isPastDue;

  if (!showForTrial && !showForGrace && !showForPastDue) {
    return null;
  }

  let message = "";
  let bgClasses = "bg-blue-600 text-white";

  if (status.isTrialActive) {
    message = t("subscription.bannerUrgent", { days: String(days) });
    bgClasses = days <= 3 ? "bg-rose-700 text-white" : "bg-amber-600 text-white";
  } else if (status.isTrialGrace) {
    message = t("subscription.bannerGrace");
    bgClasses = "bg-rose-800 text-white";
  } else if (status.isPastDue) {
    message = t("subscription.bannerPastDue");
    bgClasses = "bg-amber-700 text-white";
  }

  return (
    <div className={`w-full py-2.5 px-4 flex items-center justify-between gap-4 text-xs md:text-sm font-medium shadow-sm ${bgClasses}`}>
      <div className="flex items-center gap-2">
        <span>⚡</span>
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/subscription/upgrade")}
          className="bg-white text-zinc-900 hover:bg-zinc-100 font-semibold px-3 py-1 rounded-md text-xs transition-colors shadow-sm"
        >
          {t("subscription.upgradeCta")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 p-1 text-xs"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
