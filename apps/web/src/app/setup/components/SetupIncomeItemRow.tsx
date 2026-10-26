"use client";

import React, { useState } from "react";
import { IncomeItem } from "@money-matters/types";
import { AmountField, ConfirmDialog, FormLabel } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface SetupIncomeItemRowProps {
  inc: IncomeItem;
  index: number;
  canRemove: boolean;
  isRerun: boolean;
  onUpdateIncome: <K extends keyof IncomeItem>(id: string, field: K, value: IncomeItem[K]) => void;
  onRemoveIncome: (id: string) => void;
  onSaveIncome?: (id: string) => Promise<void>;
  isDirty?: boolean;
}

export function SetupIncomeItemRow({
  inc,
  index,
  canRemove,
  isRerun,
  onUpdateIncome,
  onRemoveIncome,
}: SetupIncomeItemRowProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isExisting = !inc.id.startsWith("inc-");

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1B2B4B]">
            {t("setup.income.incomeItemNumber", { number: index + 1 })}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => {
              if (isRerun && isExisting) {
                setShowConfirm(true);
              } else {
                onRemoveIncome(inc.id);
              }
            }}
            className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
          >
            {t("common.remove")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        <div className="flex flex-col">
          <FormLabel>{t("setup.income.nameLabel")}</FormLabel>
          <input
            type="text"
            value={inc.name}
            onChange={(e) => onUpdateIncome(inc.id, "name", e.target.value)}
            className="ui-input w-full px-3 text-xs font-bold rounded-xl border border-zinc-200 bg-white h-[46px]"
            placeholder={t("setup.income.namePlaceholder")}
          />
        </div>
        <AmountField
          label={t("setup.income.amountLabel")}
          value={String(inc.amount ?? "")}
          onChange={(val) => onUpdateIncome(inc.id, "amount", parseFloat(val) || 0)}
          allowNegative={false}
        />
        <div className="flex flex-col">
          <FormLabel>{t("categories.frequencyLabel")}</FormLabel>
          <select
            value={inc.frequency}
            onChange={(e) => onUpdateIncome(inc.id, "frequency", e.target.value as IncomeItem["frequency"])}
            className="ui-input w-full px-3 text-xs font-bold rounded-xl border border-zinc-200 bg-white h-[46px] cursor-pointer"
          >
            <option value="WEEKLY">{t("categories.frequencyWeekly")}</option>
            <option value="FORTNIGHTLY">{t("categories.frequencyFortnightly")}</option>
            <option value="MONTHLY">{t("categories.frequencyMonthly")}</option>
            <option value="ANNUALLY">{t("categories.frequencyAnnually")}</option>
          </select>
        </div>
        <div className="flex flex-col">
          <FormLabel>{t("setup.income.nextPaydayLabel")}</FormLabel>
          <input
            type="date"
            value={inc.startDate || ""}
            onChange={(e) => onUpdateIncome(inc.id, "startDate", e.target.value)}
            className="ui-input w-full px-3 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800 h-[46px]"
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          onRemoveIncome(inc.id);
        }}
        title={t("modals.incomeExpenseForm.archiveIncomeTitle")}
        description={t("modals.incomeExpenseForm.archiveIncomeConfirm")}
        confirmLabel={t("modals.incomeExpenseForm.archiveSchedule")}
        variant="danger"
      />
    </div>
  );
}
