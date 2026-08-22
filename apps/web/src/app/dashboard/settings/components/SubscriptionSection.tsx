"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner } from "@money-matters/ui";

import { t } from "@money-matters/i18n";

interface SubscriptionSectionProps {
  status?: {
    status: "TRIAL_ACTIVE" | "TRIAL_GRACE" | "TRIAL_EXPIRED" | "SUBSCRIBED" | "PAST_DUE" | "DEACTIVATED";
    trialEndsAt?: Date | string | null;
    trialGraceEndsAt?: Date | string | null;
    subscriptionEndsAt?: Date | string | null;
    daysRemainingInTrial?: number | null;
  } | null;
}

export function SubscriptionSection({ status }: SubscriptionSectionProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const portalMut = trpc.createCustomerPortalSession.useMutation();

  const handleOpenStripePortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await portalMut.mutateAsync({
        returnUrl: window.location.href,
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t("subscription.portalError"));
    } finally {
      setLoadingPortal(false);
    }
  };

  let planName = t("subscription.freePlan");
  if (status) {
    if (status.status === "SUBSCRIBED") {
      planName = t("subscription.activePlan");
    } else if (status.status === "TRIAL_ACTIVE") {
      planName = t("subscription.planTrial", { days: String(status.daysRemainingInTrial ?? 0) });
    } else if (status.status === "TRIAL_EXPIRED") {
      planName = t("subscription.planExpired");
    } else if (status.status === "PAST_DUE") {
      planName = t("subscription.planPastDue");
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        {t("subscription.sectionTitle")}
      </p>
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-500">{t("subscription.currentPlan")}</p>
            <p className="text-base font-extrabold text-[#1B2B4B] mt-0.5">
              {planName}
            </p>
          </div>
          <a
            href="/subscription/upgrade"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-xs"
          >
            {t("subscription.upgradeCta")}
          </a>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-500">{t("subscription.billingDesc")}</p>
          <button
            type="button"
            onClick={handleOpenStripePortal}
            disabled={loadingPortal}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all flex items-center gap-1.5"
          >
            {loadingPortal && <Spinner size="sm" />}
            <span>{t("subscription.billingPortal")}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
