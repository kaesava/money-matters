"use client";

import React from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { t } from "@money-matters/i18n";
import { AmountField, DatePickerField, FormLabel } from "@money-matters/ui/web";

export interface IncomeEventInlineCardProps {
  readonly sourceName: string;
  readonly onSourceNameChange: (name: string) => void;
  readonly actualAmount: string;
  readonly onActualAmountChange: (amount: string) => void;
  readonly selectedDate: string;
  readonly onSelectedDateChange: (date: string) => void;
  readonly isReadOnly: boolean;
  readonly onDeleteIncome: () => void;
  readonly onBack: () => void;
}

export function IncomeEventInlineCard({
  sourceName,
  onSourceNameChange,
  actualAmount,
  onActualAmountChange,
  selectedDate,
  onSelectedDateChange,
  isReadOnly,
  onDeleteIncome,
  onBack,
}: IncomeEventInlineCardProps) {
  return (
    <div className="space-y-3">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div>
            <FormLabel required>{t("paydayDrawer.incomeSourceLabel")}</FormLabel>
            <input
              type="text"
              value={sourceName}
              disabled={isReadOnly}
              onChange={(e) => onSourceNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 disabled:opacity-60 text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <AmountField
              label={t("paydayDrawer.incomeAmountLabel")}
              required
              value={actualAmount}
              disabled={isReadOnly}
              onChange={onActualAmountChange}
            />
          </div>

          <div>
            <DatePickerField
              label={t("paydayDrawer.incomeDate")}
              required
              value={selectedDate}
              disabled={isReadOnly}
              onChange={onSelectedDateChange}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-start">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={onDeleteIncome}
            className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer select-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t("common.delete")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
