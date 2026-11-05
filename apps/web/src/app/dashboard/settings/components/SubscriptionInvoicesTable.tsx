"use client";

import React, { useState, useEffect } from "react";
import { Spinner, PaginationBar, useCurrencyLocale, formatCurrency } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface InvoiceItem {
  id: string;
  paidAt?: string | Date | null;
  createdAt?: string | Date | null;
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
  const { locale } = useCurrencyLocale();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [invoices.length, pageSize]);

  const totalPages = Math.ceil(invoices.length / pageSize) || 1;
  const paginatedInvoices = invoices.slice((page - 1) * pageSize, page * pageSize);
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
                <th className="pb-2 text-center">{t("subscription.invoiceDate")}</th>
                <th className="pb-2 text-right">{t("subscription.invoiceAmount")}</th>
                <th className="pb-2 text-center">{t("subscription.invoiceStatus")}</th>
                <th className="pb-2 text-center">{t("subscription.invoiceReceipt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {paginatedInvoices.map((inv) => {
                const isPaid = inv.status === "paid";
                const isOpen = inv.status === "open";
                const displayDate = inv.paidAt
                  ? fmtDateMedium(inv.paidAt)
                  : inv.createdAt
                  ? fmtDateMedium(inv.createdAt)
                  : "—";
                const statusBadgeLabel = isPaid
                  ? t("subscription.statusPaid")
                  : isOpen
                  ? t("subscription.statusOpen")
                  : inv.status;
                const linkHref = isPaid
                  ? inv.invoicePdfUrl || inv.hostedInvoiceUrl
                  : inv.hostedInvoiceUrl || inv.invoicePdfUrl;
                const linkText = isPaid
                  ? t("subscription.downloadReceipt")
                  : t("subscription.payInvoice");

                return (
                  <tr
                    key={inv.id}
                    className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-2.5 font-medium text-center">{displayDate}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-bold">
                      {formatCurrency(parseFloat(inv.amountPaid), locale, inv.currency)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : isOpen
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {statusBadgeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {linkHref ? (
                        <a
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2563eb] hover:underline font-bold text-xs"
                        >
                          {linkText}
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {invoices.length >= 5 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={invoices.length}
          pageSizeOptions={[5, 10, 20]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
