"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ResizableTh, useResizableColumns } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";
import { IncomeSourceToEdit } from "../../../../components/web/IncomeFormModal";

interface IncomeSchedulesCardProps {
  incomeSources: Array<{
    id: string;
    name: string;
    amount: string | number;
    receivingAccountId?: string | null;
    accountName?: string;
    isPrivate?: boolean;
    rrule?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  bankAccounts: Array<{ id: string; name: string; isPrivate?: boolean | null }>;
  searchQuery: string;
  scopeFilter: "ALL" | "SHARED" | "PRIVATE";
  onAdd: () => void;
  onAddOneOff: () => void;
  onEdit: (source: IncomeSourceToEdit) => void;
}

function formatScheduleSummary(
  { rrule, startDate, endDate }: { rrule?: string | null; startDate?: string | null; endDate?: string | null },
  dateFormatter: (d: string | Date | number | null | undefined) => string
): string {
  if (!rrule && !startDate) return "One-off";
  let freqStr = "Recurring";
  if (rrule) {
    if (rrule.includes("FREQ=WEEKLY;INTERVAL=2") || rrule.includes("FREQ=FORTNIGHTLY")) freqStr = "every 2 weeks";
    else if (rrule.includes("FREQ=WEEKLY")) freqStr = "weekly";
    else if (rrule.includes("FREQ=MONTHLY")) freqStr = "monthly";
    else if (rrule.includes("FREQ=YEARLY") || rrule.includes("FREQ=ANNUALLY")) freqStr = "yearly";
  }
  const start = startDate ? dateFormatter(startDate) : null;
  const end = endDate ? dateFormatter(endDate) : null;
  if (start && end) return `${freqStr} from ${start} to ${end}`;
  if (start) return `${freqStr} from ${start}`;
  return freqStr;
}

export function IncomeSchedulesCard({
  incomeSources,
  bankAccounts,
  searchQuery,
  scopeFilter,
  onAdd,
  onAddOneOff,
  onEdit,
}: IncomeSchedulesCardProps) {
  const { fmtDate } = useLocale();
  const [selectedAccountId, setSelectedAccountId] = React.useState("");
  const [sortField, setSortField] = React.useState<"name" | "account" | "amount">("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const { widths, onMouseDown } = useResizableColumns({ name: 220, accountOrPool: 180, amount: 120 });

  const filtered = useMemo(() => {
    let res = incomeSources.map((inc) => {
      const acct = bankAccounts.find((b) => b.id === inc.receivingAccountId);
      return { ...inc, accountName: acct?.name || "Main Account", isPrivate: acct?.isPrivate || false };
    });
    if (scopeFilter === "PRIVATE") res = res.filter((inc) => inc.isPrivate);
    if (scopeFilter === "SHARED") res = res.filter((inc) => !inc.isPrivate);
    if (selectedAccountId) res = res.filter((inc) => inc.receivingAccountId === selectedAccountId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter((inc) => inc.name.toLowerCase().includes(q) || inc.accountName.toLowerCase().includes(q) || String(inc.amount).includes(q));
    }
    return res.sort((a, b) => {
      let comp = 0;
      if (sortField === "name") comp = a.name.localeCompare(b.name);
      else if (sortField === "account") comp = a.accountName.localeCompare(b.accountName);
      else if (sortField === "amount") comp = parseFloat(String(a.amount)) - parseFloat(String(b.amount));
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [incomeSources, bankAccounts, scopeFilter, selectedAccountId, searchQuery, sortField, sortOrder]);

  return (
    <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="font-bold text-[#1B2B4B] dark:text-white text-base">Income Schedules</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              className="px-3.5 py-2 bg-[#2563eb] text-white rounded-xl font-bold text-xs shadow-2xs hover:bg-[#1d4ed8] transition-colors shrink-0 cursor-pointer"
            >
              + {t("settings.income.addSchedule")}
            </button>
            <button
              type="button"
              onClick={onAddOneOff}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              + {t("incomeBillsTabs.oneOffIncome")}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <div className="w-64 sm:w-72 text-xs">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-900 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="">All Bank Accounts</option>
              {bankAccounts.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-zinc-400">No income schedules found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-700/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <ResizableTh width={widths.name} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("name", e)} className="py-2 px-3 text-left">
                    <button type="button" onClick={() => { setSortField("name"); setSortOrder((p) => (p === "asc" ? "desc" : "asc")); }} className="flex items-center gap-1 font-bold hover:text-zinc-700">
                      <span>{t("tables.scheduleName")}</span>
                      {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </ResizableTh>
                  <ResizableTh width={widths.accountOrPool} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("accountOrPool", e)} className="py-2 px-3 text-left">
                    <button type="button" onClick={() => { setSortField("account"); setSortOrder((p) => (p === "asc" ? "desc" : "asc")); }} className="flex items-center gap-1 font-bold hover:text-zinc-700">
                      <span>{t("tables.bankAccountUpper")}</span>
                      {sortField === "account" && (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </ResizableTh>
                  <ResizableTh width={widths.amount} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("amount", e)} className="py-2 px-3 text-right">
                    <button type="button" onClick={() => { setSortField("amount"); setSortOrder((p) => (p === "asc" ? "desc" : "asc")); }} className="flex items-center gap-1 justify-end font-bold hover:text-zinc-700 w-full">
                      <span>{t("tables.amountUpper")}</span>
                      {sortField === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </ResizableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-2.5 px-3 text-left">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEdit({
                            id: inc.id,
                            name: inc.name,
                            amount: String(inc.amount),
                            receivingAccountId: inc.receivingAccountId || undefined,
                            rrule: inc.rrule,
                            startDate: inc.startDate,
                            endDate: inc.endDate || undefined,
                          })}
                          className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                        >
                          {inc.name}
                        </button>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {formatScheduleSummary({ rrule: inc.rrule, startDate: inc.startDate, endDate: inc.endDate }, fmtDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-left text-zinc-600 dark:text-zinc-300 font-semibold text-[11px]">
                      {inc.receivingAccountId ? (
                        <Link href={`/dashboard/settings?tab=bank-accounts&id=${inc.receivingAccountId}`} className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5">
                          <span>{inc.accountName}</span>
                          <span className="text-[10px] text-blue-400">↗</span>
                        </Link>
                      ) : inc.accountName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +${parseFloat(String(inc.amount)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
