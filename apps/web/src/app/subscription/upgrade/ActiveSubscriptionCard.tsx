"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

interface ActiveSubscriptionCardProps {
  subStatus?: {
    nextBillingAt?: string | null;
    cancelAtPeriodEnd?: boolean | null;
    subscriptionEndsAt?: string | null;
  };
  onOpenPortal: () => void;
  loadingPortal: boolean;
}

export function ActiveSubscriptionCard({
  subStatus,
  onOpenPortal,
  loadingPortal,
}: ActiveSubscriptionCardProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-xl flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold">
        👑
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 self-center">
          ✓ {t("subscription.activeBadge")}
        </span>
        <h2 className="text-2xl font-extrabold text-[#1B2B4B]">
          {t("subscription.alreadySubscribedTitle")}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md">
          {t("subscription.alreadySubscribedSubtitle")}
        </p>
      </div>

      {subStatus?.nextBillingAt && !subStatus.cancelAtPeriodEnd && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold w-full max-w-md">
          {t("subscription.renewsOn", {
            date: new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
              new Date(subStatus.nextBillingAt)
            ),
          })}
        </div>
      )}

      {subStatus?.cancelAtPeriodEnd && subStatus.subscriptionEndsAt && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left flex flex-col gap-2 w-full max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <h4 className="text-xs font-bold text-amber-900">
              {t("subscription.cancelingBannerTitle")}
            </h4>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {t("subscription.cancelingBannerDesc", {
              date: new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
                new Date(subStatus.subscriptionEndsAt)
              ),
            })}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
        <Button
          variant="primary"
          onClick={onOpenPortal}
          loading={loadingPortal}
          className="w-full justify-center"
        >
          {subStatus?.cancelAtPeriodEnd
            ? t("subscription.resumeSubscriptionCta")
            : t("subscription.manageSubscription")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push("/dashboard")}
          className="w-full justify-center"
        >
          {t("subscription.backToDashboard")}
        </Button>
      </div>

      <div className="mt-2 text-center text-xs text-slate-400 font-medium">
        {t("subscription.supportHelpText", { email: "support@moneymatters.kaesava.au" })}
      </div>
    </div>
  );
}
