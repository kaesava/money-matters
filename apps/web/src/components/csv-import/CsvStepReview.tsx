"use client";

import React, { useState } from "react";
import { fmtDate, useResizableColumns, ResizableTh } from "@money-matters/ui/web";

export interface ParsedTx {
  date: string;
  description: string;
  amount: string;
  flowType: "DEBIT" | "CREDIT";
  targetPool?: "EVERYDAY" | "REGULAR" | "GOAL";
  creditAction?: "BANK_DEPOSIT" | "PAYDAY_ALLOCATION";
  idempotencyKey: string;
  rawBank: string;
  isDuplicate?: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: "EVERYDAY" | "REGULAR" | "GOAL";
}

export interface CsvStepReviewProps {
  parsedData: {
    bank: string;
    transactions: ParsedTx[];
    statementStartDate?: string | null;
    statementEndDate?: string | null;
  };
  targetBankAccountName?: string;
  selectedExpenses: number;
  selectedIncome: number;
  netImpact: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: "ALL" | "DEBIT" | "CREDIT" | "DUPLICATES";
  setFilterType: (t: "ALL" | "DEBIT" | "CREDIT" | "DUPLICATES") => void;
  filteredTransactions: Array<{ tx: ParsedTx; idx: number }>;
  allSelected: boolean;
  handleToggleSelectAll: (checked: boolean) => void;
  selectedMap: Record<number, boolean>;
  setSelectedMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  poolMap: Record<number, "EVERYDAY" | "REGULAR" | "GOAL">;
  setPoolMap: React.Dispatch<React.SetStateAction<Record<number, "EVERYDAY" | "REGULAR" | "GOAL">>>;
  creditActionMap: Record<number, "BANK_DEPOSIT" | "PAYDAY_ALLOCATION">;
  setCreditActionMap: React.Dispatch<React.SetStateAction<Record<number, "BANK_DEPOSIT" | "PAYDAY_ALLOCATION">>>;
  includedMap: Record<number, boolean>;
  setIncludedMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  noteMap: Record<number, string>;
  setNoteMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  categoryMapState: Record<number, string>;
  setCategoryMapState: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  categories: CategoryItem[];
  flowTypeOverrideMap: Record<number, "DEBIT" | "CREDIT">;
  setFlowTypeOverrideMap: React.Dispatch<React.SetStateAction<Record<number, "DEBIT" | "CREDIT">>>;
  getEffectiveFlowType: (tx: ParsedTx, idx: number) => "DEBIT" | "CREDIT";
}

export function CsvStepReview({
  parsedData,
  targetBankAccountName,
  selectedExpenses,
  selectedIncome,
  netImpact,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filteredTransactions,
  allSelected,
  handleToggleSelectAll,
  selectedMap,
  setSelectedMap,
  poolMap,
  setPoolMap,
  creditActionMap,
  setCreditActionMap,
  includedMap,
  setIncludedMap,
  noteMap,
  setNoteMap,
  categoryMapState,
  setCategoryMapState,
  categories,
  flowTypeOverrideMap: _flowTypeOverrideMap,
  setFlowTypeOverrideMap,
  getEffectiveFlowType,
}: CsvStepReviewProps) {
  // Bulk Action Local Tool States
  const [bulkPoolTarget, setBulkPoolTarget] = useState<"EVERYDAY" | "REGULAR" | "GOAL">("EVERYDAY");
  const [bulkStatusTarget, setBulkStatusTarget] = useState<boolean>(true);

  const { widths, onMouseDown } = useResizableColumns({
    date: 120,
    desc: 260,
    target: 220,
    amount: 120,
    status: 140,
  });

  const selectedIndices = Object.keys(selectedMap)
    .map(Number)
    .filter((idx) => selectedMap[idx]);

  const hasSelection = selectedIndices.length > 0;

  const handleApplyBulkPool = () => {
    if (!hasSelection) return;
    setPoolMap((prev) => {
      const next = { ...prev };
      selectedIndices.forEach((idx) => {
        const tx = parsedData.transactions[idx];
        if (tx && getEffectiveFlowType(tx, idx) === "DEBIT") {
          next[idx] = bulkPoolTarget;
        }
      });
      return next;
    });
  };

  const handleFlipSelectedPolarity = () => {
    if (!hasSelection) return;
    setFlowTypeOverrideMap((prev) => {
      const next = { ...prev };
      selectedIndices.forEach((idx) => {
        const tx = parsedData.transactions[idx];
        if (tx) {
          const currentFlow = getEffectiveFlowType(tx, idx);
          next[idx] = currentFlow === "DEBIT" ? "CREDIT" : "DEBIT";
        }
      });
      return next;
    });
  };

  const handleApplyBulkStatus = () => {
    if (!hasSelection) return;
    setIncludedMap((prev) => {
      const next = { ...prev };
      selectedIndices.forEach((idx) => {
        next[idx] = bulkStatusTarget;
      });
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Statement Coverage & Financial Totals Metrics Banner */}
      <div className="space-y-2">
        {parsedData.statementStartDate && parsedData.statementEndDate && (
          <div className="flex items-center justify-between text-xs font-bold bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-2 rounded-xl">
            <span className="flex items-center gap-1.5">
              <span>📅</span>
              <span>
                Statement Period: {fmtDate(parsedData.statementStartDate)} — {fmtDate(parsedData.statementEndDate)}
              </span>
            </span>
            <span className="text-[#2563eb] text-[11px] font-bold">
              Target Account: {targetBankAccountName || parsedData.bank} ({parsedData.transactions.length} rows)
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-900 rounded-2xl text-white shadow-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Included Expenses
            </span>
            <span className="text-base font-black text-rose-400 tabular-nums">
              -${selectedExpenses.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Included Income
            </span>
            <span className="text-base font-black text-emerald-400 tabular-nums">
              +${selectedIncome.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Net Impact
            </span>
            <span className={`text-base font-black tabular-nums ${netImpact >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {netImpact >= 0 ? "+" : ""}${netImpact.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description or amount..."
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
          {(["ALL", "DEBIT", "CREDIT", "DUPLICATES"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                filterType === t ? "bg-[#2563eb] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t === "ALL" ? "All" : t === "DEBIT" ? "Debits" : t === "CREDIT" ? "Credits" : "Duplicates"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-100/90 rounded-xl text-xs border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-700">Selected: {selectedIndices.length}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Flip Polarity */}
          <button
            type="button"
            disabled={!hasSelection}
            onClick={handleFlipSelectedPolarity}
            title="Invert expense/income polarity for selected rows"
            className="px-2.5 py-1 text-xs font-bold bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>🔄</span>
            <span>Flip Selected</span>
          </button>

          {/* Bulk Pool Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1">
            <select
              value={bulkPoolTarget}
              onChange={(e) => setBulkPoolTarget(e.target.value as "EVERYDAY" | "REGULAR" | "GOAL")}
              disabled={!hasSelection}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none disabled:opacity-40"
            >
              <option value="EVERYDAY">💳 Everyday Pool</option>
              <option value="REGULAR">🗓️ Bills Pool</option>
              <option value="GOAL">🎯 Savings Pool</option>
            </select>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={handleApplyBulkPool}
              className="px-2 py-0.5 text-[10px] font-extrabold bg-[#2563eb] text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Go
            </button>
          </div>

          {/* Bulk Status Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1">
            <select
              value={bulkStatusTarget ? "INCLUDE" : "EXCLUDE"}
              onChange={(e) => setBulkStatusTarget(e.target.value === "INCLUDE")}
              disabled={!hasSelection}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none disabled:opacity-40"
            >
              <option value="INCLUDE">✅ Include</option>
              <option value="EXCLUDE">🚫 Exclude</option>
            </select>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={handleApplyBulkStatus}
              className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Go
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Review Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider z-10">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                  title="Select all visible filtered transactions"
                />
              </th>
              <ResizableTh width={widths.date} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("date", e)} className="p-3">Date</ResizableTh>
              <ResizableTh width={widths.desc} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("desc", e)} className="p-3">Description</ResizableTh>
              <ResizableTh width={widths.target} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("target", e)} className="p-3">Mapped Target</ResizableTh>
              <ResizableTh width={widths.amount} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("amount", e)} className="p-3 text-right">Amount</ResizableTh>
              <ResizableTh width={widths.status} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("status", e)} className="p-3 text-center">Action / Status</ResizableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  No statement transactions found matching your filter/search.
                </td>
              </tr>
            ) : (
              filteredTransactions.map(({ tx, idx }) => {
                const isSelected = !!selectedMap[idx];
                const isIncluded = includedMap[idx] !== false;
                const flow = getEffectiveFlowType(tx, idx);
                const currentPool = poolMap[idx] || "EVERYDAY";
                const currentCreditAction = creditActionMap[idx] || "BANK_DEPOSIT";
                const goalCategories = categories.filter((c) => c.type === "GOAL");

                return (
                  <tr
                    key={`${tx.idempotencyKey || "row"}-${idx}`}
                    className={`hover:bg-slate-50 transition-colors ${
                      tx.isDuplicate ? "bg-amber-50/40" : ""
                    } ${!isIncluded ? "opacity-40 bg-slate-50/50 line-through" : ""}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isIncluded}
                        onChange={(e) =>
                          setSelectedMap((prev) => ({ ...prev, [idx]: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {fmtDate(tx.date)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={noteMap[idx] !== undefined ? noteMap[idx] : tx.description}
                          disabled={!isIncluded}
                          onChange={(e) =>
                            setNoteMap((prev) => ({
                              ...prev,
                              [idx]: e.target.value,
                            }))
                          }
                          className={`w-full px-2 py-1 text-xs border rounded-lg font-semibold transition-all ${
                            !isIncluded
                              ? "bg-slate-100/70 border-slate-200 text-slate-400 line-through cursor-not-allowed"
                              : "bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-[#2563eb]"
                          }`}
                        />
                        {tx.isDuplicate && (
                          <span className="text-[10px] text-amber-700 font-bold">
                            ⚠️ Duplicate detected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {flow === "DEBIT" ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={currentPool}
                            disabled={!isIncluded}
                            onChange={(e) =>
                              setPoolMap((prev) => ({
                                ...prev,
                                [idx]: e.target.value as "EVERYDAY" | "REGULAR" | "GOAL",
                              }))
                            }
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg font-semibold bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="EVERYDAY">💳 Everyday Pool</option>
                            <option value="REGULAR">🗓️ Bills Pool</option>
                            <option value="GOAL">🎯 Savings Goals Pool</option>
                          </select>

                          {currentPool === "GOAL" && goalCategories.length > 0 && (
                            <select
                              value={categoryMapState[idx] || ""}
                              disabled={!isIncluded}
                              onChange={(e) =>
                                setCategoryMapState((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                              className="w-full px-2 py-1 text-[11px] border border-blue-300 bg-blue-50/70 rounded-lg font-bold text-blue-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">(Default Goal Pool)</option>
                              {goalCategories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  🎯 {cat.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <select
                          value={currentCreditAction}
                          disabled={!isIncluded}
                          onChange={(e) =>
                            setCreditActionMap((prev) => ({
                              ...prev,
                              [idx]: e.target.value as "BANK_DEPOSIT" | "PAYDAY_ALLOCATION",
                            }))
                          }
                          className="w-full px-2 py-1 text-xs border border-emerald-300 bg-emerald-50/60 rounded-lg font-bold text-emerald-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="BANK_DEPOSIT">💰 Direct Bank Deposit</option>
                          <option value="PAYDAY_ALLOCATION">🌊 Payday Income (Waterfall)</option>
                        </select>
                      )}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        flow === "CREDIT" ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {flow === "CREDIT" ? "+" : "−"}${tx.amount}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={isIncluded ? "INCLUDE" : "EXCLUDE"}
                        onChange={(e) =>
                          setIncludedMap((prev) => ({
                            ...prev,
                            [idx]: e.target.value === "INCLUDE",
                          }))
                        }
                        className={`w-full px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          isIncluded
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                      >
                        <option value="INCLUDE">✅ Include</option>
                        <option value="EXCLUDE">
                          {tx.isDuplicate ? "🚫 Exclude (Duplicate)" : "🚫 Exclude"}
                        </option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
