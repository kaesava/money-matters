"use client";

import React, { useState } from "react";
import { trpc } from "../../../../lib/trpc";
import { Spinner, useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface SubscriptionSectionProps {
  status?: {
    status: "TRIAL_ACTIVE" | "TRIAL_GRACE" | "TRIAL_EXPIRED" | "SUBSCRIBED" | "PAST_DUE" | "DEACTIVATED";
    trialEndsAt?: Date | string | null;
    trialGraceEndsAt?: Date | string | null;
    subscriptionEndsAt?: Date | string | null;
    daysRemainingInTrial?: number | null;
    cancelAtPeriodEnd?: boolean;
    planType?: "monthly" | "annual" | "founding" | null;
    nextBillingAt?: Date | string | null;
  } | null;
}

export function SubscriptionSection({ status }: SubscriptionSectionProps) {
  const toast = useToast();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const portalMut = trpc.createCustomerPortalSession.useMutation();
  const invoicesQuery = trpc.listInvoices.useQuery(undefined, {
    enabled: status?.status === "SUBSCRIBED" || status?.status === "PAST_DUE",
  });

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
      toast.error(err instanceof Error ? err.message : t("subscription.portalError"));
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

  const invoices = invoicesQuery.data || [];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          {t("subscription.sectionTitle")}
        </p>
        <div
          className="p-5 rounded-2xl flex flex-col gap-4 shadow-xs"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500">{t("subscription.currentPlan")}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-extrabold text-[#1B2B4B]">
                  {planName}
                </p>
                {status?.cancelAtPeriodEnd && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    {t("subscription.cancelingBadge")}
                  </span>
                )}
              </div>
            </div>
            <a
              href="/subscription/upgrade"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-xs"
            >
              {t("subscription.upgradeCta")}
            </a>
          </div>

          {status?.cancelAtPeriodEnd && status.subscriptionEndsAt && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>
                {t("subscription.cancelingNotice", {
                  date: new Intl.DateTimeFormat("en-AU").format(new Date(status.subscriptionEndsAt)),
                })}
              </span>
            </div>
          )}

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <p className="text-xs text-zinc-500">{t("subscription.billingDesc")}</p>
            <button
              type="button"
              onClick={handleOpenStripePortal}
              disabled={loadingPortal}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {loadingPortal && <Spinner size="sm" />}
              <span>{t("subscription.billingPortal")}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-400 font-medium">
            {t("subscription.supportHelpText", { email: "support@moneymatters.kaesava.au" })}
          </div>
        </div>
      </div>

      {/* Invoice History & Receipts */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
          {t("subscription.invoiceHistoryTitle")}
        </p>
        <div
          className="p-5 rounded-2xl flex flex-col gap-3 shadow-xs"
          style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
        >
          {invoicesQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="md" className="text-[#2563eb]" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-2">
              {t("subscription.noInvoices")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="pb-2 text-left">{t("subscription.invoiceDate")}</th>
                    <th className="pb-2 text-right">{t("subscription.invoiceAmount")}</th>
                    <th className="pb-2 text-center">{t("subscription.invoiceStatus")}</th>
                    <th className="pb-2 text-center">{t("subscription.invoiceReceipt")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="text-zinc-700 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2.5 font-medium text-left">
                        {inv.paidAt ? new Intl.DateTimeFormat("en-AU").format(new Date(inv.paidAt)) : "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-bold">
                        ${inv.amountPaid} {inv.currency}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        {inv.invoicePdfUrl || inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.invoicePdfUrl || inv.hostedInvoiceUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563eb] hover:underline font-bold text-xs"
                          >
                            {t("subscription.downloadReceipt")}
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
