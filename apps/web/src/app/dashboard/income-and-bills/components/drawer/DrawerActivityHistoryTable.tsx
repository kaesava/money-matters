"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";

export interface DrawerTransactionItem {
  id: string;
  note?: string | null;
  flowType: "CREDIT" | "DEBIT" | string;
  amount: string | number;
  recordedAt?: string | Date | null;
}

export interface DrawerActivityHistoryTableProps {
  poolId?: string;
  historyTransactionsList: DrawerTransactionItem[];
  onClose: () => void;
  fmtDate: (date: string | Date) => string;
  fmtTx: (amount: string | number, flowType?: "DEBIT" | "CREDIT") => string;
}

export function DrawerActivityHistoryTable({
  poolId,
  historyTransactionsList,
  onClose,
  fmtDate,
  fmtTx,
}: DrawerActivityHistoryTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/dashboard/history?poolId=${poolId || ""}`}
          onClick={onClose}
          className="text-xs font-bold text-[#2563eb] hover:underline transition-colors inline-flex items-center gap-1"
        >
          <span>{t("categoryDrawer.seeFullHistory")}</span>
          <span>→</span>
        </Link>
      </div>

      {historyTransactionsList.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-xs font-medium">
          {t("categoryDrawer.noTransactions")}
        </div>
      ) : (
        <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                <th className="p-3 text-center">{t("categoryDrawer.date")}</th>
                <th className="p-3">{t("categoryDrawer.description")}</th>
                <th className="p-3 text-center">{t("categoryDrawer.type")}</th>
                <th className="p-3 text-right">{t("categoryDrawer.amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {historyTransactionsList.map((tx) => {
                const noteText =
                  tx.note ||
                  (tx as unknown as { envelopeName?: string }).envelopeName ||
                  t("categoryDrawer.transactionFallback");
                const isDebit = tx.flowType === "DEBIT";

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="p-3 font-mono text-zinc-500 text-[11px] text-center">
                      {tx.recordedAt ? fmtDate(tx.recordedAt) : "—"}
                    </td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100 max-w-[180px] truncate">
                      {noteText}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          isDebit
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {tx.flowType}
                      </span>
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold ${
                        isDebit ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {fmtTx(tx.amount || "0", isDebit ? "DEBIT" : "CREDIT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
