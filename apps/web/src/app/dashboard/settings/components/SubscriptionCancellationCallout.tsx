"use client";

import React from "react";
import { t } from "@money-matters/i18n";

interface SubscriptionCancellationCalloutProps {
  status?: {
    cancelAtPeriodEnd?: boolean;
    subscriptionEndsAt?: string | Date | null;
    nextBillingAt?: string | Date | null;
  } | null;
  isSubscribed: boolean;
  loadingPortal: boolean;
  onOpenPortal: () => void;
  fmtDateMedium: (d: string | Date | number | null | undefined) => string;
}

export function SubscriptionCancellationCallout({
  status,
  isSubscribed,
  loadingPortal,
  onOpenPortal,
  fmtDateMedium,
}: SubscriptionCancellationCalloutProps) {
  const daysUntilBilling = status?.nextBillingAt
    ? Math.ceil((new Date(status.nextBillingAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : -1;

  const showRenewalNotice =
    isSubscribed &&
    !status?.cancelAtPeriodEnd &&
    daysUntilBilling >= 0 &&
    daysUntilBilling <= 7 &&
    !!status?.nextBillingAt;

  return (
    <>
      {/* Cancellation Reassurance Callout */}
      {status?.cancelAtPeriodEnd && status?.subscriptionEndsAt && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t("subscription.cancelingBannerTitle")}
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                {t("subscription.cancelingBannerDesc", {
                  date: fmtDateMedium(status.subscriptionEndsAt),
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPortal}
            disabled={loadingPortal}
            className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all self-start sm:self-center shadow-xs cursor-pointer"
          >
            {t("subscription.resumeSubscription")} ↗
          </button>
        </div>
      )}

      {/* Upcoming 7-Day Renewal Advance Reminder */}
      {showRenewalNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-3 text-xs">
          <span className="text-base shrink-0">ℹ️</span>
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-200">
              {t("subscription.upcomingRenewalTitle")}
            </h4>
            <p className="text-blue-800/90 dark:text-blue-300/90 mt-0.5">
              {t("subscription.upcomingRenewalDesc", {
                date: fmtDateMedium(status!.nextBillingAt),
              })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
