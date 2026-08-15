"use client";

import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { t } from "@money-matters/i18n";

export function TrialStatusBadge() {
  const { status, isLoading } = useSubscriptionStatus();

  if (isLoading || !status || status.isSubscribed) {
    return null;
  }

  if (status.isTrialActive) {
    const days = status.daysRemainingInTrial ?? 30;
    const isUrgent = days <= 7;
    return (
      <div
        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
          isUrgent
            ? "bg-amber-100 text-amber-900 border border-amber-300"
            : "bg-blue-50 text-blue-800 border border-blue-200"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span>
          {t("subscription.trialActive")} ({days}d left)
        </span>
      </div>
    );
  }

  if (status.isTrialGrace) {
    return (
      <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        <span>{t("subscription.trialGracePeriod")}</span>
      </div>
    );
  }

  if (status.isTrialExpired) {
    return (
      <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        <span>{t("subscription.trialExpired")} — $9.95/mo</span>
      </div>
    );
  }

  if (status.isPastDue) {
    return (
      <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>{t("subscription.pastDue")}</span>
      </div>
    );
  }

  return null;
}
