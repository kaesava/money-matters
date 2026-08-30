"use client";

import React from "react";
import { PaginationBar } from "@money-matters/ui/web";

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
  fmtMoney,
  isLoading,
}: BankAccountTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
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
              <th className="py-3.5 px-4 text-center">Access</th>

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
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded-md w-16 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-7 bg-zinc-200 rounded-lg w-24 ml-auto" /></td>
                </tr>
              ))
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-400">
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
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        className="text-sm font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                      >
                        {acc.name}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${availBal < 0 ? "text-rose-600" : "text-[#1B2B4B]"}`}>
                          {fmtMoney(availBal)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          Actual Balance: {fmtMoney(actualBal)}
                          {buf > 0 && ` (Reserved: ${fmtMoney(buf)})`}
                        </span>
                        {(acc.linkedPoolsCount ?? 0) > 0 && acc.hasDifference && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAlignmentModal?.(acc);
                            }}
                            className="mt-1 text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>Needs Alignment ({acc.differenceAmount && acc.differenceAmount > 0 ? "+" : ""}{fmtMoney(acc.differenceAmount)})</span>
                          </button>
                        )}
                        {(acc.linkedPoolsCount ?? 0) > 0 && !acc.hasDifference && (
                          <span className="mt-0.5 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Balanced</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {((acc.poolTypes || acc.categoryTypes || []) as CategoryType[]).length === 0 ? (
                          <span className="text-[10px] font-semibold text-zinc-400 italic">None linked</span>
                        ) : (
                          ((acc.poolTypes || acc.categoryTypes || []) as CategoryType[]).map((type) => {
                            const badgeStyle =
                              type === "EVERYDAY"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : type === "REGULAR"
                                ? "bg-blue-50 text-[#2563eb] border-blue-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200";
                            return (
                              <span
                                key={type}
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeStyle}`}
                              >
                                {type === "EVERYDAY" ? "Everyday" : type === "REGULAR" ? "Bills" : "Goal"}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {acc.isPrivate ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                          🔒 Private
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 inline-block">
                          👥 Household
                        </span>
                      )}
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


      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
