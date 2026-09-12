"use client";

import React, { useState } from "react";
import { AmountField, DatePickerField } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";
import { BankTransferRollupCard, BankTransferPool, BankTransferAccount } from "./BankTransferRollupCard";

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface IncomeSplitCommandPanelProps {
  readonly sourceName: string;
  readonly onSourceNameChange: (name: string) => void;
  readonly actualAmount: string;
  readonly onActualAmountChange: (amount: string) => void;
  readonly selectedDate: string;
  readonly onSelectedDateChange: (date: string) => void;
  readonly numericActual: number;
  readonly sweepPoolName: string;
  readonly sweepPoolRemainder: number;
  readonly isDeficit: boolean;
  readonly everydayAllocated: number;
  readonly billsAllocated: number;
  readonly goalsAllocated: number;
  readonly isReadOnly: boolean;
  readonly receivingAccountId?: string | null;
  readonly pools: BankTransferPool[];
  readonly linesMap: Record<string, string>;
  readonly sweepPoolId?: string;
  readonly bankAccounts: BankTransferAccount[];
  readonly isAmountModified?: boolean;
  readonly onRecalculateWaterfall?: () => void;
  readonly submitting?: boolean;
}

export function IncomeSplitCommandPanel({
  sourceName,
  onSourceNameChange,
  actualAmount,
  onActualAmountChange,
  selectedDate,
  onSelectedDateChange,
  numericActual,
  sweepPoolName,
  sweepPoolRemainder,
  isDeficit,
  everydayAllocated,
  billsAllocated,
  goalsAllocated,
  isReadOnly,
  receivingAccountId,
  pools,
  linesMap,
  sweepPoolId,
  bankAccounts,
  isAmountModified,
  onRecalculateWaterfall,
  submitting,
}: IncomeSplitCommandPanelProps) {
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  const { fmtDate } = useLocale();

  const billsPercent = numericActual > 0 ? Math.min(100, (billsAllocated / numericActual) * 100) : 0;
  const goalsPercent = numericActual > 0 ? Math.min(100 - billsPercent, (goalsAllocated / numericActual) * 100) : 0;
  const surplusPercent = numericActual > 0 ? Math.max(0, (sweepPoolRemainder / numericActual) * 100) : 0;

  return (
    <aside className="w-full lg:w-96 shrink-0 space-y-5">
      {/* 1. Paycheck Details Card (Collapsible) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setDetailsCollapsed((prev) => !prev)}
          className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400">
              {detailsCollapsed ? "▶" : "▼"}
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              {t("paydayDrawer.reviewIncome", { defaultValue: "Review Income" })} - {fmtDate(selectedDate)}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
            {fmt(numericActual)}
          </span>
        </button>

        {!detailsCollapsed && (
          <div className="px-5 pb-5 pt-1 space-y-3.5 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {t("paydayDrawer.incomeSourceLabel", { defaultValue: "Income Source / Description" })} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sourceName}
                disabled={isReadOnly}
                onChange={(e) => onSourceNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 disabled:opacity-60"
              />
            </div>

            <AmountField
              label={t("paydayDrawer.incomeAmountLabel", { defaultValue: "Income Amount ($)" })}
              required
              value={actualAmount}
              onChange={onActualAmountChange}
              disabled={isReadOnly}
            />

            <DatePickerField
              label={t("paydayDrawer.incomeDate", { defaultValue: "Income Date" })}
              value={selectedDate}
              onChange={onSelectedDateChange}
              disabled={isReadOnly}
            />

            {isAmountModified && onRecalculateWaterfall && !isReadOnly && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2 text-xs animate-in fade-in">
                <p className="text-blue-900 dark:text-blue-200 font-medium">
                  {t("paydayDrawer.amountChangedPrompt", { defaultValue: "Income amount changed." })}
                </p>
                <button
                  type="button"
                  onClick={onRecalculateWaterfall}
                  disabled={submitting}
                  className="w-full py-1.5 px-3 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  {t("paydayDrawer.reRunWaterfall", { defaultValue: "Re-run income splits" })}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Reactive Live Safe-to-Spend / Surplus Gauge Card */}
      <div
        className={`border rounded-2xl p-5 shadow-xs space-y-4 transition-colors ${
          isDeficit
            ? "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-900"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
            {t("paydayDrawer.safeToSpendRemaining", { defaultValue: "Safe-to-Spend / Surplus" })}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {sweepPoolName}
          </span>
        </div>

        <div className="space-y-1">
          <div
            className={`text-3xl font-mono font-black tracking-tight ${
              isDeficit ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {fmt(sweepPoolRemainder)}
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            {isDeficit
              ? t("paydayDrawer.activeDeficitWarning", { defaultValue: "Allocations exceed total income" })
              : `${fmt(everydayAllocated)} total safe-to-spend allocated`}
          </p>
        </div>

        {/* Deficit Alert Banner */}
        {isDeficit && (
          <div className="p-3 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200 font-bold space-y-1">
            <span>
              ⚠️ {t("paydayDrawer.deficitAlert", {
                amount: fmt(Math.abs(sweepPoolRemainder)),
                defaultValue: `Over-allocated by ${fmt(Math.abs(sweepPoolRemainder))}. Reduce other pools to balance.`,
              })}
            </span>
          </div>
        )}

        {/* Visual Allocation Proportion Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
            <div style={{ width: `${billsPercent}%` }} className="bg-blue-500 h-full transition-all" title={`Bills: ${billsPercent.toFixed(0)}%`} />
            <div style={{ width: `${goalsPercent}%` }} className="bg-indigo-500 h-full transition-all" title={`Goals: ${goalsPercent.toFixed(0)}%`} />
            <div style={{ width: `${surplusPercent}%` }} className="bg-emerald-500 h-full transition-all" title={`Surplus: ${surplusPercent.toFixed(0)}%`} />
          </div>

          <div className="flex justify-between text-[10px] font-bold text-zinc-500 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Bills {fmt(billsAllocated)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Goals {fmt(goalsAllocated)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Surplus {fmt(Math.max(0, sweepPoolRemainder))}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bank Transfer Rollup Card */}
      <BankTransferRollupCard
        receivingAccountId={receivingAccountId}
        pools={pools}
        linesMap={linesMap}
        sweepPoolId={sweepPoolId}
        sweepPoolRemainder={sweepPoolRemainder}
        bankAccounts={bankAccounts}
        paycheckAmount={numericActual}
        paycheckDate={selectedDate}
      />
    </aside>
  );
}
