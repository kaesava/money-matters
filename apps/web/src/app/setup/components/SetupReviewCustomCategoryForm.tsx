"use client";

import React from "react";
import { AmountField } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface SetupReviewCustomCategoryFormProps {
  customCatName: string;
  setCustomCatName: (val: string) => void;
  customCatType: "REGULAR" | "GOAL" | "EVERYDAY";
  setCustomCatType: (val: "REGULAR" | "GOAL" | "EVERYDAY") => void;
  customCatAmount: string;
  setCustomCatAmount: (val: string) => void;
  onAddCustomCategory: () => void;
}

export function SetupReviewCustomCategoryForm({
  customCatName,
  setCustomCatName,
  customCatType,
  setCustomCatType,
  customCatAmount,
  setCustomCatAmount,
  onAddCustomCategory,
}: SetupReviewCustomCategoryFormProps) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
      <span className="text-xs font-bold text-[#1B2B4B]">
        {t("setup.reviewSummary.addCustomCategory")}
      </span>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={customCatName}
          onChange={(e) => setCustomCatName(e.target.value)}
          placeholder="Category Name"
          className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200"
        />
        <select
          value={customCatType}
          onChange={(e) => setCustomCatType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
          className="px-2 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-slate-50"
        >
          <option value="REGULAR">{t("setup.categories.typeRegular")}</option>
          <option value="EVERYDAY">{t("setup.categories.typeEveryday")}</option>
          <option value="GOAL">{t("setup.categories.typeGoal")}</option>
        </select>
        <div className="w-28">
          <AmountField
            value={customCatAmount}
            onChange={setCustomCatAmount}
            placeholder="Monthly $"
            allowNegative={false}
          />
        </div>
        <button
          type="button"
          onClick={onAddCustomCategory}
          className="px-4 py-2 bg-[#2563eb] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
