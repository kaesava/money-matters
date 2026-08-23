"use client";

import React from "react";

export interface ParsedTx {
  date: string;
  description: string;
  amount: string;
  flowType: "CREDIT" | "DEBIT";
  suggestedCategoryName?: string | null;
  idempotencyKey: string;
  rawBank: string;
  isDuplicate?: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
  type?: string;
}

export interface IncomeSourceOption {
  id: string;
  name: string;
}

export interface CsvStepReviewProps {
  parsedData: {
    bank: string;
    transactions: ParsedTx[];
    statementStartDate?: string | null;
    statementEndDate?: string | null;
  };
  selectedExpenses: number;
  selectedIncome: number;
  netImpact: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: "ALL" | "DEBIT" | "CREDIT" | "DUPLICATES";
  setFilterType: (t: "ALL" | "DEBIT" | "CREDIT" | "DUPLICATES") => void;
  showAddCategoryInline: boolean;
  setShowAddCategoryInline: (show: boolean) => void;
  newCatName: string;
  setNewCatName: (name: string) => void;
  newCatType: "EVERYDAY" | "REGULAR" | "GOAL";
  setNewCatType: (t: "EVERYDAY" | "REGULAR" | "GOAL") => void;
  isCreatingCategory: boolean;
  handleCreateInlineCategory: (e: React.FormEvent) => void;
  handleFlipPolarity: () => void;
  getFlowType: (tx: ParsedTx) => "CREDIT" | "DEBIT";
  filteredTransactions: Array<{ tx: ParsedTx; idx: number }>;
  allSelected: boolean;
  handleToggleSelectAll: (checked: boolean) => void;
  categories: CategoryOption[];
  incomeSources: IncomeSourceOption[];
  selectedMap: Record<number, boolean>;
  setSelectedMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  categoryMap: Record<number, string>;
  setCategoryMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  incomeSourceMap: Record<number, string>;
  setIncomeSourceMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  handleBulkCategoryChange: (catId: string) => void;
}

export function CsvStepReview({
  parsedData,
  selectedExpenses,
  selectedIncome,
  netImpact,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  showAddCategoryInline,
  setShowAddCategoryInline,
  newCatName,
  setNewCatName,
  newCatType,
  setNewCatType,
  isCreatingCategory,
  handleCreateInlineCategory,
  handleFlipPolarity,
  getFlowType,
  filteredTransactions,
  allSelected,
  handleToggleSelectAll,
  categories,
  incomeSources,
  selectedMap,
  setSelectedMap,
  categoryMap,
  setCategoryMap,
  incomeSourceMap,
  setIncomeSourceMap,
  handleBulkCategoryChange,
}: CsvStepReviewProps) {
  return (
    <div className="space-y-4">
      {/* Statement Coverage & Financial Totals Metrics Banner */}
      <div className="space-y-2">
        {parsedData.statementStartDate && parsedData.statementEndDate && (
          <div className="flex items-center justify-between text-xs font-bold bg-blue-50 border border-blue-200 text-blue-900 px-3.5 py-2 rounded-xl">
            <span className="flex items-center gap-1.5">
              <span>📅</span>
              <span>Statement Period: {parsedData.statementStartDate} — {parsedData.statementEndDate}</span>
            </span>
            <span className="text-[#2563eb] text-[11px]">
              Bank: {parsedData.bank} ({parsedData.transactions.length} rows)
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-900 rounded-2xl text-white shadow-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Selected Expenses</span>
            <span className="text-base font-black text-rose-400 tabular-nums">
              -${selectedExpenses.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Selected Income</span>
            <span className="text-base font-black text-emerald-400 tabular-nums">
              +${selectedIncome.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Net Impact</span>
            <span className={`text-base font-black tabular-nums ${netImpact >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {netImpact >= 0 ? "+" : ""}${netImpact.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description or amount..."
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFlipPolarity}
            title="Invert expense/income polarity if bank CSV exports credits as debits"
            className="px-2.5 py-1.5 text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 rounded-lg flex items-center gap-1"
          >
            <span>🔄</span>
            <span>Flip Debit/Credit</span>
          </button>

          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
            {(["ALL", "DEBIT", "CREDIT", "DUPLICATES"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  filterType === t ? "bg-[#2563eb] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t === "ALL" ? "All" : t === "DEBIT" ? "Debits" : t === "CREDIT" ? "Credits" : "Duplicates"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
            className="px-3 py-1.5 text-xs font-bold bg-blue-50 border border-blue-200 text-[#2563eb] hover:bg-blue-100 rounded-lg flex items-center gap-1"
          >
            <span>➕</span>
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Inline Add Category Form */}
      {showAddCategoryInline && (
        <form onSubmit={handleCreateInlineCategory} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in duration-150">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name (e.g. Pet Care)..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
            required
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as "EVERYDAY" | "REGULAR" | "GOAL")}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800"
          >
            <option value="EVERYDAY">Everyday Pool</option>
            <option value="REGULAR">Bills Pool</option>
            <option value="GOAL">Savings Pool</option>
          </select>
          <button
            type="submit"
            disabled={isCreatingCategory}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-lg shadow-xs"
          >
            {isCreatingCategory ? "Saving..." : "Save Category"}
          </button>
        </form>
      )}

      {/* Bulk Category Selector */}
      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
        <span>Apply Category to Selected Debits:</span>
        <select
          onChange={(e) => handleBulkCategoryChange(e.target.value)}
          defaultValue=""
          className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800"
        >
          <option value="" disabled>Choose bulk category...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Review Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
                />
              </th>
              <th className="p-3 w-24">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3 w-48">Mapped Target</th>
              <th className="p-3 w-28 text-right">Amount</th>
              <th className="p-3 w-24 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No statement transactions found matching your filter/search.
                </td>
              </tr>
            ) : (
              filteredTransactions.map(({ tx, idx }) => {
                const isSelected = !!selectedMap[idx];
                return (
                  <tr
                    key={tx.idempotencyKey || idx}
                    className={`hover:bg-slate-50 transition-colors ${
                      tx.isDuplicate ? "bg-amber-50/40" : ""
                    } ${!isSelected ? "opacity-50 bg-slate-50/50" : ""}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          setSelectedMap((prev) => ({ ...prev, [idx]: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
                      />
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{tx.date}</td>
                    <td className="p-3 font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span>{tx.description}</span>
                        {tx.suggestedCategoryName && (
                          <span className="text-[10px] text-blue-600 font-normal">
                            Auto-matched: {tx.suggestedCategoryName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {getFlowType(tx) === "DEBIT" ? (
                        <select
                          value={categoryMap[idx] || ""}
                          onChange={(e) =>
                            setCategoryMap((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg font-semibold bg-white"
                        >
                          <option value="" disabled>Select category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={incomeSourceMap[idx] || categoryMap[idx] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isInc = incomeSources.some((inc) => inc.id === val);
                            if (isInc) {
                              setIncomeSourceMap((prev) => ({ ...prev, [idx]: val }));
                              setCategoryMap((prev) => {
                                const next = { ...prev };
                                delete next[idx];
                                return next;
                              });
                            } else {
                              setCategoryMap((prev) => ({ ...prev, [idx]: val }));
                              setIncomeSourceMap((prev) => {
                                const next = { ...prev };
                                delete next[idx];
                                return next;
                              });
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-emerald-300 bg-emerald-50/50 rounded-lg font-bold text-emerald-900"
                        >
                          <optgroup label="Income Sources">
                            {incomeSources.map((inc) => (
                              <option key={inc.id} value={inc.id}>
                                💰 {inc.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Category Pool Target">
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                📂 {c.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      )}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold tabular-nums ${
                        getFlowType(tx) === "CREDIT" ? "text-emerald-600" : "text-slate-900"
                      }`}
                    >
                      {getFlowType(tx) === "CREDIT" ? "+" : "-"}${tx.amount}
                    </td>
                    <td className="p-3 text-center">
                      {tx.isDuplicate ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          ⚠️ Duplicate
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ready
                        </span>
                      )}
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
