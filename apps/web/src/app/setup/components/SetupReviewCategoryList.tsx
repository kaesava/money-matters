"use client";

import React from "react";
import { EstimatedCategoryItem } from "@money-matters/types";
import { AmountField } from "@money-matters/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";

interface SetupReviewCategoryListProps {
  title: string;
  totalMonthly: number;
  badgeLabel?: string;
  badgeColorClass?: string;
  categories: EstimatedCategoryItem[];
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>
  >;
  setAmountOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRemoveCategory: (name: string) => void;
  convertToMonthly: (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY") => number;
  convertFromMonthly: (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY") => number;
  onToggleBillType?: (name: string, newType: "SCHEDULED_BILL" | "FLEXIBLE_BILL") => void;
  children?: React.ReactNode;
}

export function SetupReviewCategoryList({
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
  children,
}: SetupReviewCategoryListProps) {
  const { fmt } = useLocale();
  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
          {title}
        </span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border font-mono ${badgeColorClass}`}>
          {badgeLabel || `${fmt(totalMonthly)}/mo`}
        </span>
      </div>

      {children}

      <div className="flex flex-col gap-2">
        {categories.map((cat) => {
          const freq = categoryFrequencies[cat.name] || "MONTHLY";
          const displayVal = convertFromMonthly(cat.monthlyAud, freq);
          const isBill = cat.type === "REGULAR";
          const isFlexible = cat.envelopeType === "FLEXIBLE_BILL";
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
                    onClick={() => onToggleBillType(cat.name, isFlexible ? "SCHEDULED_BILL" : "FLEXIBLE_BILL")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                      isFlexible
                        ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    {isFlexible ? "Flexible" : "Scheduled"}
                  </button>
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
                    const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                    setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-zinc-200 bg-slate-50 text-zinc-700"
                >
                  <option value="WEEKLY">/ wk</option>
                  <option value="FORTNIGHTLY">/ fn</option>
                  <option value="MONTHLY">/ mo</option>
                  <option value="YEARLY">/ yr</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveCategory(cat.name)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
