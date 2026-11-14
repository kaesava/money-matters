"use client";

import React, { useState } from "react";
import { EstimatedCategoryItem } from "@money-matters/types";
import { AmountField, ConfirmDialog, InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../providers/LocaleProvider";

interface SetupReviewEnvelopeListProps {
  title: string;
  totalMonthly: number;
  badgeLabel?: string;
  badgeColorClass?: string;
  categories: EstimatedCategoryItem[];
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">>
  >;
  setAmountOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRemoveCategory: (name: string) => void;
  convertToMonthly: (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") => number;
  convertFromMonthly: (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") => number;
  onToggleBillType?: (name: string, newType: "RECURRING" | "TARGET_BALANCE") => void;
  onEditCategory?: (category: EstimatedCategoryItem) => void;
  isRerun?: boolean;
  children?: React.ReactNode;
}

export function SetupReviewEnvelopeList({
  title,
  totalMonthly,
  badgeLabel,
  badgeColorClass = "text-[#2563eb] bg-blue-50 border-blue-200",
  categories,
  categoryFrequencies,
  setCategoryFrequencies,
  setAmountOverrides,
  onRemoveCategory,
  convertToMonthly,
  convertFromMonthly,
  onToggleBillType,
  onEditCategory,
  isRerun = false,
  children,
}: SetupReviewEnvelopeListProps) {
  const { fmt } = useLocale();
  const [categoryToArchive, setCategoryToArchive] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
          {title}
        </span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border font-mono ${badgeColorClass}`}>
          {badgeLabel || `${fmt(totalMonthly)} ${t("setup.freqSuffixMo")}`}
        </span>
      </div>

      {children}

      <div className="flex flex-col gap-2">
        {categories.map((cat) => {
          const freq = categoryFrequencies[cat.name] || "MONTHLY";
          const displayVal = convertFromMonthly(cat.monthlyAud, freq);
          const isBill = cat.type === "BILL";
          const isFlexible = cat.fundingMode === "TARGET_BALANCE";
          const isSpecial =
            cat.envelopeType === "EVERYDAY" ||
            (cat.type === "EVERYDAY" && categories.length <= 1) ||
            Boolean(cat.isSurplusTarget);
          const isExistingDbItem = Boolean(cat.id && !cat.id.startsWith("temp-"));

          return (
            <div
              key={cat.name}
              className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white gap-2 flex-wrap sm:flex-nowrap"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-[#1B2B4B] truncate">{cat.name}</span>
                {isBill && onToggleBillType && (
                  <button
                    type="button"
                    onClick={() => onToggleBillType(cat.name, isFlexible ? "RECURRING" : "TARGET_BALANCE")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                      isFlexible
                        ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {isFlexible ? t("categories.flexibleBillBadge") : t("categories.scheduledBillBadge")}
                  </button>
                )}
                {isBill && !isFlexible && cat.generateEvents === false && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200 shrink-0"
                    title={t("categories.tooltips.eventsOff")}
                  >
                    {t("categories.badgeEventsOff")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="w-28 sm:w-32">
                  <AmountField
                    value={String(displayVal ?? "")}
                    onChange={(val) => {
                      const num = parseFloat(val) || 0;
                      const monthly = convertToMonthly(num, freq);
                      setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                    }}
                    allowNegative={false}
                  />
                </div>
                <select
                  value={freq}
                  onChange={(e) => {
                    const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
                    setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-zinc-200 bg-slate-50 text-zinc-700 cursor-pointer"
                >
                  <option value="WEEKLY">{t("setup.freqSuffixWk")}</option>
                  <option value="FORTNIGHTLY">{t("setup.freqSuffixFn")}</option>
                  <option value="MONTHLY">{t("setup.freqSuffixMo")}</option>
                  <option value="QUARTERLY">{t("setup.freqSuffixQtr")}</option>
                  <option value="YEARLY">{t("setup.freqSuffixYr")}</option>
                </select>
                {onEditCategory && (
                  <button
                    type="button"
                    onClick={() => onEditCategory(cat)}
                    className="px-2 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    {t("common.edit")}
                  </button>
                )}

                {isSpecial ? (
                  <span className="inline-flex items-center" title={t("categories.cannotDeleteSpecialEnvelope")}>
                    <InfoTooltip content={t("categories.cannotDeleteSpecialEnvelope")} />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isRerun && isExistingDbItem) {
                        setCategoryToArchive(cat.name);
                      } else {
                        onRemoveCategory(cat.name);
                      }
                    }}
                    className="text-xs font-bold text-red-400 hover:text-red-600 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={Boolean(categoryToArchive)}
        onClose={() => setCategoryToArchive(null)}
        onConfirm={() => {
          if (categoryToArchive) {
            onRemoveCategory(categoryToArchive);
            setCategoryToArchive(null);
          }
        }}
        title={t("setup.confirmArchiveEnvelopeTitle")}
        description={t("setup.confirmArchiveEnvelopeDesc", { name: categoryToArchive || "" })}
        confirmLabel={t("common.remove")}
        variant="danger"
      />
    </div>
  );
}
