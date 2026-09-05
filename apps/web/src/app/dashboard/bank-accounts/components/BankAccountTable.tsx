"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { PaginationBar, SkeletonTable } from "@money-matters/ui/web";

export type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";
export type CategoryType = "EVERYDAY" | "REGULAR" | "GOAL";

export interface BankAccountItem {
  id: string;
  name: string;
  bankProvider?: string;
  lastKnownBalance?: string;
  unbudgetedBuffer?: string;
  isPrivate?: boolean;
  poolTypes?: CategoryType[];
  categoryTypes?: CategoryType[];
  updatedAt?: string | Date;
  expectedBalance?: number;
  hasDifference?: boolean;
  differenceAmount?: number;
  linkedPoolsCount?: number;
  linkedPools?: Array<{ id: string; name: string; poolType: string; currentBalance: number; isSurplusTarget?: boolean }>;
}

export interface BankAccountTableProps {
  accounts: BankAccountItem[];
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  sortField: "name" | "lastKnownBalance";
  sortDir: "asc" | "desc";
  toggleSort: (field: "name" | "lastKnownBalance") => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  openEditModal: (acc: BankAccountItem) => void;
  openImportModal: (acc: BankAccountItem) => void;
  openAlignmentModal?: (acc: BankAccountItem) => void;
  openLinkedPoolsModal?: (acc: BankAccountItem) => void;
  fmtMoney: (val: string | number | undefined) => string;
  isLoading?: boolean;
}

export function BankAccountTable({
  accounts,
  page,
  totalPages,
  pageSize,
  totalItems,
  sortField,
  sortDir,
  toggleSort,
  onPageChange,
  onPageSizeChange,
  openEditModal,
  openImportModal,
  openAlignmentModal,
  openLinkedPoolsModal,
  fmtMoney,
  isLoading,
}: BankAccountTableProps) {
  const [selectedAccForPools, setSelectedAccForPools] = React.useState<BankAccountItem | null>(null);

  useEffect(() => {
    if (!selectedAccForPools) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedAccForPools(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedAccForPools]);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
      {isLoading ? (
        <SkeletonTable cols={5} rows={pageSize} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-left" onClick={() => toggleSort("name")}>
                <div className="flex items-center gap-1">
                  <span>Account Details</span>
                  {sortField === "name" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right" onClick={() => toggleSort("lastKnownBalance")}>
                <div className="flex items-center justify-end gap-1">
                  <span>Available Balance</span>
                  {sortField === "lastKnownBalance" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">
                <span>Linked Pools</span>
              </th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
            {isLoading ? (
              [1, 2, 3].map((idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded-md w-32" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded-md w-24 ml-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded-md w-20 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-7 bg-zinc-200 rounded-lg w-24 ml-auto" /></td>
                </tr>
              ))
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-400">
                  No bank accounts found matching your search.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => {
                const actualBal = parseFloat(acc.lastKnownBalance || "0");
                const buf = parseFloat(acc.unbudgetedBuffer || "0");
                const availBal = Math.max(0, actualBal - buf);

                return (
                  <tr key={acc.id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="py-4 px-4 font-bold text-[#1B2B4B]">
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="text-sm font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                          >
                            {acc.name}
                          </button>
                          {acc.isPrivate && (
                            <span
                              title="Private"
                              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center cursor-help"
                            >
                              🔒
                            </span>
                          )}
                        </div>
                        {acc.hasDifference && (() => {
                          const diff = acc.differenceAmount || 0;
                          const labelStr = diff > 0
                            ? `Reconcile Surplus of ${fmtMoney(diff)}`
                            : `Reconcile Shortfall of ${fmtMoney(Math.abs(diff))}`;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAlignmentModal?.(acc);
                              }}
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>{labelStr}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${availBal < 0 ? "text-rose-600" : "text-[#1B2B4B]"}`}>
                          {fmtMoney(availBal)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          Actual Balance: {fmtMoney(actualBal)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {(acc.linkedPoolsCount ?? 0) === 0 ? (
                          <span className="text-[11px] font-medium text-zinc-400 italic">No pools linked</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openLinkedPoolsModal ? openLinkedPoolsModal(acc) : setSelectedAccForPools(acc)}
                              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>{acc.linkedPoolsCount} {acc.linkedPoolsCount === 1 ? "Pool" : "Pools"} Linked</span>
                            </button>
                            {(() => {
                              const poolsTotal = (acc.linkedPools || []).reduce((sum, p) => sum + (p.currentBalance || 0), 0);
                              const expectedStr = `Expected ${fmtMoney(poolsTotal)}.`;

                              if (!acc.hasDifference) {
                                return (
                                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>{expectedStr} Balanced</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openImportModal(acc)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Import CSV Statement for this account"
                        >
                          <span>📄</span>
                          <span>Import CSV</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}


      {totalItems >= 5 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      {/* Linked Pools Details Modal */}
      {selectedAccForPools && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl border border-zinc-200 p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-[#1B2B4B]">Linked Pools</h4>
                <p className="text-[11px] text-zinc-500">{selectedAccForPools.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAccForPools(null)}
                className="text-zinc-400 hover:text-zinc-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {!(selectedAccForPools.linkedPools) || selectedAccForPools.linkedPools.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-2">No pools currently linked.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 pb-1 border-b border-zinc-100">
                    <span>Pool Name &amp; Type</span>
                    <span>Balance</span>
                  </div>
                  {selectedAccForPools.linkedPools.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 text-xs">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/pools?search=${encodeURIComponent(p.name)}`}
                          onClick={() => setSelectedAccForPools(null)}
                          className="font-bold text-[#2563eb] hover:underline cursor-pointer"
                        >
                          {p.name}
                        </Link>
                        {p.isSurplusTarget && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                            Sweep Pool
                          </span>
                        )}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          p.poolType === "EVERYDAY" ? "bg-emerald-50 text-emerald-700" : p.poolType === "REGULAR" ? "bg-blue-50 text-[#2563eb]" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {p.poolType === "EVERYDAY" ? "Everyday" : p.poolType === "REGULAR" ? "Bills" : "Goal"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-zinc-800">${(p.currentBalance || 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedAccForPools(null)}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
