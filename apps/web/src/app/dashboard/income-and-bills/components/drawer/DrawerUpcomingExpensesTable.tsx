"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import type { CategoryScheduledEvent } from "../EnvelopeDetailDrawer";

export interface DrawerUpcomingExpensesTableProps {
  poolId?: string;
  upcomingExpensesList: CategoryScheduledEvent[];
  onClose: () => void;
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
  fmt: (val: string | number) => string;
}

export function DrawerUpcomingExpensesTable({
  poolId,
  upcomingExpensesList,
  onClose,
  onMarkPaid,
  fmt,
}: DrawerUpcomingExpensesTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE&poolId=${poolId || ""}`}
          onClick={onClose}
          className="text-xs font-bold text-[#2563eb] hover:underline transition-colors inline-flex items-center gap-1"
        >
          <span>{t("categoryDrawer.seeAllUpcomingExpenses")}</span>
          <span>→</span>
        </Link>
      </div>

      {upcomingExpensesList.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-xs font-medium">
          {t("categoryDrawer.noExpenses")}
        </div>
      ) : (
        <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                <th className="p-3">{t("categoryDrawer.expenseName")}</th>
                <th className="p-3 text-center">{t("categoryDrawer.dueDate")}</th>
                <th className="p-3 text-right">{t("categoryDrawer.amount")}</th>
                <th className="p-3 text-center">{t("categoryDrawer.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {upcomingExpensesList.map((evt) => (
                <tr key={evt.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {evt.name}
                  </td>
                  <td className="p-3 text-center font-mono text-zinc-500">
                    {evt.dueDate}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-[#1B2B4B] dark:text-white">
                    {fmt(evt.amount || "0")}
                  </td>
                  <td className="p-3 text-center">
                    {evt.isPaid ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md inline-block">
                        {t("categoryDrawer.confirmed")}
                      </span>
                    ) : onMarkPaid ? (
                      <button
                        type="button"
                        onClick={() => onMarkPaid(evt.id, evt.amount, evt.dueDate)}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-[#2563eb] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {t("categoryDrawer.markPaid")}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-block">
                        {t("categoryDrawer.pending")}
                      </span>
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
