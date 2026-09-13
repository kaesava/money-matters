"use client";

import React from "react";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface InvoiceItem {
  id: string;
  paidAt?: string | Date | null;
  amountPaid: string;
  currency: string;
  status: string;
  invoicePdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
}

interface SubscriptionInvoicesTableProps {
  invoices: InvoiceItem[];
  isLoading: boolean;
  fmtDateMedium: (d: string | Date | number | null | undefined) => string;
}

export function SubscriptionInvoicesTable({
  invoices,
  isLoading,
  fmtDateMedium,
}: SubscriptionInvoicesTableProps) {
  return (
    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {t("subscription.invoiceHistoryTitle")}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" className="text-[#2563eb]" />
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">
          {t("subscription.noInvoices")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="pb-2 text-left">{t("subscription.invoiceDate")}</th>
                <th className="pb-2 text-right">{t("subscription.invoiceAmount")}</th>
                <th className="pb-2 text-center">{t("subscription.invoiceStatus")}</th>
                <th className="pb-2 text-center">{t("subscription.invoiceReceipt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="py-2.5 font-medium text-left">
                    {inv.paidAt ? fmtDateMedium(inv.paidAt) : "—"}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-bold">
                    ${inv.amountPaid} {inv.currency}
                  </td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        inv.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      }`}
                    >
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
  );
}
