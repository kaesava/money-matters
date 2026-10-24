"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ResizableTh, useResizableColumns, formatScheduleSummary } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";

interface BillSchedulesCardProps {
  billSchedules: Array<{
    id: string;
    name: string;
    amount: string | number;
    poolId: string;
    poolName: string;
    categoryId?: string;
    envelopeType?: string | null;
    rrule?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isPrivate?: boolean;
    budgetFrequency?: string | null;
    isEssential?: boolean;
  }>;
  searchQuery: string;
  scopeFilter: "ALL" | "SHARED" | "PRIVATE";
  onAddBillSchedule: () => void;
  onAddOneOff: () => void;
  onEditCategory: (category: {
    id: string;
    name: string;
    poolId: string;
    envelopeType?: string | null;
    monthlyAmount?: string | null;
    enteredAmount?: string | null;
    budgetFrequency?: string | null;
    isEssential?: boolean;
  }) => void;
}

export function BillSchedulesCard({
  billSchedules,
  searchQuery,
  scopeFilter,
  onAddBillSchedule,
  onAddOneOff,
  onEditCategory,
}: BillSchedulesCardProps) {
  const { fmtDate } = useLocale();
  const [selectedPoolId, setSelectedPoolId] = React.useState("");
  const [sortField, setSortField] = React.useState<"name" | "pool" | "amount">("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const { widths, onMouseDown } = useResizableColumns({ name: 220, accountOrPool: 180, amount: 120 });

  const poolsList = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of billSchedules) map.set(b.poolId, b.poolName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [billSchedules]);

  const filtered = useMemo(() => {
    let res = [...billSchedules];
    if (scopeFilter === "PRIVATE") res = res.filter((b) => b.isPrivate);
    if (scopeFilter === "SHARED") res = res.filter((b) => !b.isPrivate);
    if (selectedPoolId) res = res.filter((b) => b.poolId === selectedPoolId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter((b) => b.name.toLowerCase().includes(q) || b.poolName.toLowerCase().includes(q) || String(b.amount).includes(q));
    }
    return res.sort((a, b) => {
      let comp = 0;
      if (sortField === "name") comp = a.name.localeCompare(b.name);
      else if (sortField === "pool") comp = a.poolName.localeCompare(b.poolName);
      else if (sortField === "amount") comp = parseFloat(String(a.amount)) - parseFloat(String(b.amount));
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [billSchedules, scopeFilter, selectedPoolId, searchQuery, sortField, sortOrder]);

  return (
    <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="font-bold text-[#1B2B4B] dark:text-white text-base">{t("incomeBillsTabs.billSchedulesHeading")}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddBillSchedule}
              className="px-3.5 py-2 bg-[#2563eb] text-white rounded-xl font-bold text-xs shadow-2xs hover:bg-[#1d4ed8] transition-colors shrink-0 cursor-pointer"
            >
              + {t("incomeBillsTabs.addBillSchedule")}
            </button>
            <button
              type="button"
              onClick={onAddOneOff}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              + {t("incomeBillsTabs.oneOffExpense")}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <div className="w-64 sm:w-72 text-xs">
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-900 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="">{t("incomeBillsTabs.allBillsEnvelopes")}</option>
              {poolsList.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-zinc-400">{t("incomeBillsTabs.noBillSchedulesFound")}</div>
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
                    <button type="button" onClick={() => { setSortField("pool"); setSortOrder((p) => (p === "asc" ? "desc" : "asc")); }} className="flex items-center gap-1 font-bold hover:text-zinc-700">
                      <span>{t("tables.assignedEnvelope")}</span>
                      {sortField === "pool" && (sortOrder === "asc" ? "↑" : "↓")}
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
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-2.5 px-3 text-left">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onEditCategory({
                              id: b.id,
                              name: b.name,
                              poolId: b.poolId,
                              envelopeType: b.envelopeType,
                              monthlyAmount: String(b.amount),
                              enteredAmount: String(b.amount),
                              budgetFrequency: b.budgetFrequency || "MONTHLY",
                              isEssential: b.isEssential ?? false,
                            })
                          }
                          className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>{b.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">✎</span>
                        </button>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {formatScheduleSummary({ rrule: b.rrule, startDate: b.startDate, endDate: b.endDate, envelopeType: b.envelopeType }, fmtDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-left text-zinc-600 dark:text-zinc-300 font-semibold text-[11px]">
                      <Link href={`/dashboard/envelopes?poolId=${b.poolId}`} className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5">
                        <span>{b.poolName}</span>
                        <span className="text-[10px] text-blue-400">↗</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      −${parseFloat(String(b.amount)).toFixed(2)}
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
