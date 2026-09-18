"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner, useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../../api/src/routers/_app";
import { useLocale } from "../../../../providers/LocaleProvider";
import { SubscriptionInvoicesTable } from "./SubscriptionInvoicesTable";
import { SubscriptionCancellationCallout } from "./SubscriptionCancellationCallout";

type RouterOutput = inferRouterOutputs<AppRouter>;

interface SubscriptionSectionProps {
  status?: RouterOutput["getSubscriptionStatus"] | null;
}

export function SubscriptionSection({ status }: SubscriptionSectionProps) {
  const { fmtDateMedium } = useLocale();
  const toast = useToast();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const trpcUtils = trpc.useUtils();
  const portalMut = trpc.createCustomerPortalSession.useMutation();
  const syncMut = trpc.syncSubscription.useMutation();
  const invoicesQuery = trpc.listInvoices.useQuery(undefined, {
    enabled: status?.status === "SUBSCRIBED" || status?.status === "PAST_DUE",
  });

  // Auto-reconcile subscription status when returning from Stripe Customer Portal
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("stripe_sync") === "true") {
      setSyncing(true);
      syncMut
        .mutateAsync()
        .then(() => {
          trpcUtils.getSubscriptionStatus.invalidate();
          trpcUtils.listInvoices.invalidate();
          toast.success(t("subscription.syncedSuccess"));
        })
        .catch((err) => {
          console.warn("Auto-sync error:", err);
        })
        .finally(() => {
          setSyncing(false);
          urlParams.delete("stripe_sync");
          const newSearch = urlParams.toString();
          const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
          window.history.replaceState({}, "", newUrl);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncMut.mutateAsync();
      await Promise.all([
        trpcUtils.getSubscriptionStatus.invalidate(),
        trpcUtils.listInvoices.invalidate(),
      ]);
      toast.success(t("subscription.syncedSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("subscription.portalError"));
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenStripePortal = async () => {
    setLoadingPortal(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await portalMut.mutateAsync({
        returnUrl: `${origin}/dashboard/settings?tab=account-data&stripe_sync=true`,
      });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("subscription.portalError"));
    } finally {
      setLoadingPortal(false);
    }
  };

  let planName = t("subscription.freePlan");
  if (status) {
    if (status.status === "SUBSCRIBED") {
      if (status.planType === "founding") {
        planName = t("subscription.planFounding");
      } else if (status.planType === "annual") {
        planName = t("subscription.planAnnual");
      } else if (status.planType === "monthly") {
        planName = t("subscription.planMonthly");
      } else {
        planName = t("subscription.planActive");
      }
    } else if (status.status === "TRIAL_ACTIVE") {
      planName = t("subscription.planTrial", { days: String(status.daysRemainingInTrial ?? 0) });
    } else if (status.status === "TRIAL_EXPIRED") {
      planName = t("subscription.planExpired");
    } else if (status.status === "PAST_DUE") {
      planName = t("subscription.planPastDue");
    }
  }

  const invoices = invoicesQuery.data || [];
  const isSubscribed = status?.status === "SUBSCRIBED";

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        {t("subscription.sectionTitle")}
      </p>

      <div
        className="p-6 rounded-2xl flex flex-col gap-6 shadow-xs"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {t("subscription.currentPlan")}
              </p>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing}
                title={t("subscription.refreshTooltip")}
                aria-label={t("subscription.refreshTooltip")}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5 rounded cursor-pointer"
              >
                <span className={`inline-block text-xs font-bold ${syncing ? "animate-spin" : ""}`}>↻</span>
              </button>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <h3 className="text-xl font-extrabold text-[#1B2B4B] dark:text-white">
                {planName}
              </h3>
              {isSubscribed && !status?.cancelAtPeriodEnd && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ {t("subscription.activeBadge")}
                </span>
              )}
              {status?.cancelAtPeriodEnd && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  ⚠️ {t("subscription.cancelingBadge")}
                </span>
              )}
              {status?.status === "TRIAL_ACTIVE" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] border border-blue-200 dark:border-blue-800">
                  ✨ {t("subscription.trialBadge")}
                </span>
              )}
            </div>

            {isSubscribed && !status?.cancelAtPeriodEnd && status?.nextBillingAt && (
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                {t("subscription.renewsOn", {
                  date: fmtDateMedium(status.nextBillingAt),
                })}
              </p>
            )}

            {status?.cancelAtPeriodEnd && status?.subscriptionEndsAt && (
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium">
                {t("subscription.cancelingNotice", {
                  date: fmtDateMedium(status.subscriptionEndsAt),
                })}
              </p>
            )}
          </div>

          <div>
            {isSubscribed ? (
              <button
                type="button"
                onClick={handleOpenStripePortal}
                disabled={loadingPortal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:text-zinc-950 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {loadingPortal && <Spinner size="sm" />}
                <span>{t("subscription.manageSubscription")}</span>
                <span className="text-zinc-400 font-mono">↗</span>
              </button>
            ) : (
              <a
                href="/subscription/upgrade"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-xs"
              >
                {t("subscription.upgradeCta")}
              </a>
            )}
          </div>
        </div>

        <SubscriptionCancellationCallout
          status={status}
          isSubscribed={isSubscribed}
          loadingPortal={loadingPortal}
          onOpenPortal={handleOpenStripePortal}
          fmtDateMedium={fmtDateMedium}
        />

        <p className="text-xs text-zinc-500 leading-relaxed">
          {t("subscription.billingDesc")}
        </p>

        {/* Invoices & Receipts Sub-panel */}
        {(isSubscribed || invoices.length > 0) && (
          <SubscriptionInvoicesTable
            invoices={invoices}
            isLoading={invoicesQuery.isLoading}
            fmtDateMedium={fmtDateMedium}
          />
        )}

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 font-medium">
          {t("subscription.supportHelpText", { email: "info@moneymatters.kaesava.au" })}
        </div>
      </div>
    </section>
  );
}
