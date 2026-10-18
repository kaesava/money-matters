"use client";

import React, { useState } from "react";
import { IncomeItem } from "@money-matters/types";
import { AmountField, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { Check } from "lucide-react";

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
  onSaveIncome,
  isDirty = false,
}: SetupIncomeItemRowProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isExisting = !inc.id.startsWith("inc-");

  const handleSave = async () => {
    if (!onSaveIncome) return;
    setIsSaving(true);
    try {
      await onSaveIncome(inc.id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1B2B4B]">
            {t("setup.income.incomeItemNumber", { number: index + 1 })}
          </span>
          {isRerun && isExisting && isDirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              aria-label={t("common.save")}
              className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          )}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">{t("setup.income.nameLabel")}</label>
          <input
            type="text"
            value={inc.name}
            onChange={(e) => onUpdateIncome(inc.id, "name", e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
            placeholder={t("setup.income.namePlaceholder")}
          />
        </div>
        <AmountField
          label={t("setup.income.amountLabel")}
          value={String(inc.amount ?? "")}
          onChange={(val) => onUpdateIncome(inc.id, "amount", parseFloat(val) || 0)}
          allowNegative={false}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">{t("categories.frequencyLabel")}</label>
          <select
            value={inc.frequency}
            onChange={(e) => onUpdateIncome(inc.id, "frequency", e.target.value as IncomeItem["frequency"])}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
          >
            <option value="WEEKLY">{t("categories.frequencyWeekly")}</option>
            <option value="FORTNIGHTLY">{t("categories.frequencyFortnightly")}</option>
            <option value="MONTHLY">{t("categories.frequencyMonthly")}</option>
            <option value="ANNUALLY">{t("categories.frequencyAnnually")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">{t("setup.income.nextPaydayLabel")}</label>
          <input
            type="date"
            value={inc.startDate || ""}
            onChange={(e) => onUpdateIncome(inc.id, "startDate", e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800"
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
