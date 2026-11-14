"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { AmountField } from "@money-matters/ui/web";
import type { PoolItem } from "./ReconciliationModal";

interface ReconciliationAdvancedSplitTableProps {
  reason: string;
  setReason: (val: string) => void;
  visiblePools: PoolItem[];
  adjustments: Record<string, string>;
  handleAdjustmentChange: (poolId: string, newVal: string, currentBalance: number) => void;
  isSurplus: boolean;
  hasHiddenZeroPools: boolean;
  sumAdjustments: number;
  absVariance: number;
  isSumValid: boolean;
  fmtMoney: (num: number) => string;
  currency: string;
  currencySymbol: string;
  minorUnits: number;
}

/**
 * Advanced multi-envelope adjustment split table inside the web ReconciliationModal.
 */
export const ReconciliationAdvancedSplitTable: React.FC<ReconciliationAdvancedSplitTableProps> = ({
  reason,
  setReason,
  visiblePools,
  adjustments,
  handleAdjustmentChange,
  isSurplus,
  hasHiddenZeroPools,
  sumAdjustments,
  absVariance,
  isSumValid,
  fmtMoney,
  currency,
  currencySymbol,
  minorUnits,
}) => {
  return (
    <div className="space-y-3 pt-1 animate-in fade-in duration-150">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {t("bankAccounts.reconcile.reasonLabel")}
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("bankAccounts.reconcile.reasonPlaceholder")}
          className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50/50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-slate-800 dark:text-zinc-200"
        />
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-2 text-left">{t("bankAccounts.reconcile.tablePool")}</th>
              <th className="py-2 text-right">{t("bankAccounts.reconcile.tableAvailable")}</th>
              <th className="py-2 text-right w-44">{t("bankAccounts.reconcile.tableAdjustment")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium text-slate-800 dark:text-zinc-200">
            {visiblePools.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400 italic">{t("bankAccounts.reconcile.noLinkedPools")}</td>
              </tr>
            ) : (
              visiblePools.map((pool) => {
                const val = adjustments[pool.id] ?? "0.00";
                const badgeStyle = pool.poolType === "EVERYDAY" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : pool.poolType === "BILL" ? "bg-blue-50 text-[#2563eb] dark:bg-blue-950 dark:text-blue-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300";
                return (
                  <tr key={pool.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50">
                    <td className="py-2.5 text-left">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1B2B4B] dark:text-white">{pool.name}</span>
                          {pool.isSurplusTarget && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md">
                              {t("bankAccounts.reconcile.sweepGoalBadge")}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold inline-block w-max mt-0.5 rounded px-1.5 py-0.2 ${badgeStyle}`}>
                          {pool.poolType === "EVERYDAY" ? t("poolTypes.everyday") : pool.poolType === "BILL" ? t("poolTypes.bills") : t("poolTypes.goals")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-600 dark:text-zinc-400">
                      {fmtMoney(pool.currentBalance)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="w-44 ml-auto">
                        <AmountField
                          value={val}
                          onChange={(newVal) => handleAdjustmentChange(pool.id, newVal, pool.currentBalance)}
                          max={!isSurplus ? pool.currentBalance : undefined}
                          placeholder="0.00"
                          allowNegative={false}
                          currency={currency}
                          currencySymbol={currencySymbol}
                          minorUnits={minorUnits}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {hasHiddenZeroPools && (
          <p className="text-[10px] text-slate-400 italic pt-1">
            {t("bankAccounts.reconcile.zeroBalanceHiddenNotice")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100 dark:border-zinc-800">
        <span className="text-slate-500">{t("bankAccounts.reconcile.allocatedSplitTotal")}</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${isSumValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {fmtMoney(sumAdjustments)} / {fmtMoney(absVariance)}
          </span>
          {isSumValid ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t("bankAccounts.reconcile.matches")}</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">
              {t("bankAccounts.reconcile.remaining", { amount: fmtMoney(Math.abs(absVariance - sumAdjustments)) })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
