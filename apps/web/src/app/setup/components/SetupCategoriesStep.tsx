"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { EstimatedCategoryItem } from "@money-matters/types";
import { InfoTooltip, Button } from "@money-matters/ui/web";
import { UserGoalItem } from "./SetupGoalsStep";
import { SetupReviewSummaryCards } from "./SetupReviewSummaryCards";
import { SetupReviewCategoryList } from "./SetupReviewCategoryList";
import { SetupReviewGoalsList } from "./SetupReviewGoalsList";
import { SetupReviewCustomCategoryForm } from "./SetupReviewCustomCategoryForm";

interface SetupCategoriesStepProps {
  activeEveryday: EstimatedCategoryItem[];
  activeRegular: EstimatedCategoryItem[];
  activeGoals: EstimatedCategoryItem[];
  goals?: UserGoalItem[];
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>
  >;
  setAmountOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRemoveCategory: (name: string) => void;
  customCatName: string;
  setCustomCatName: (val: string) => void;
  customCatType: "REGULAR" | "GOAL" | "EVERYDAY";
  setCustomCatType: (val: "REGULAR" | "GOAL" | "EVERYDAY") => void;
  customCatAmount: string;
  setCustomCatAmount: (val: string) => void;
  onAddCustomCategory: () => void;
  convertToMonthly: (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY") => number;
  convertFromMonthly: (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY") => number;
  totalMonthlyIncomeAud: number;
  totalAllocatedMonthly: number;
  totalEverydayMonthly: number;
  totalRegularMonthly: number;
  totalGoalMonthly: number;
  isSubmitting: boolean;
  onBack: () => void;
  onFinish: () => void;
  onSimulatePayday?: () => void;
  isRerun?: boolean;
}

export function SetupCategoriesStep({
  activeEveryday,
  activeRegular,
  activeGoals,
  goals = [],
  categoryFrequencies,
  setCategoryFrequencies,
  setAmountOverrides,
  onRemoveCategory,
  customCatName,
  setCustomCatName,
  customCatType,
  setCustomCatType,
  customCatAmount,
  setCustomCatAmount,
  onAddCustomCategory,
  convertToMonthly,
  convertFromMonthly,
  totalMonthlyIncomeAud,
  totalAllocatedMonthly,
  totalEverydayMonthly,
  totalRegularMonthly,
  totalGoalMonthly,
  isSubmitting,
  onBack,
  onFinish,
  onSimulatePayday,
  isRerun = false,
}: SetupCategoriesStepProps) {
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const handleAttemptRemove = (name: string) => {
    const lower = name.trim().toLowerCase();
    if (lower.includes("emergency") || lower.includes("surplus") || lower.includes("reserve")) {
      setWarningMsg(`"${name}" is designated as your Surplus Sweep Target and cannot be deleted.`);
      setTimeout(() => setWarningMsg(null), 4000);
      return;
    }
    onRemoveCategory(name);
  };

  const netSurplus = totalMonthlyIncomeAud - totalAllocatedMonthly;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[68vh] overflow-y-auto pr-1 max-w-3xl mx-auto w-full">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B]">
              {t("setup.reviewSummary.title")}
            </h2>
            <InfoTooltip
              title={t("setup.reviewSummary.title")}
              content={t("setup.reviewSummary.subtitle")}
            />
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {t("setup.reviewSummary.summaryPreviewBadge")}
          </span>
        </div>
      </div>

      {warningMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 shadow-xs">
          {warningMsg}
        </div>
      )}

      <SetupReviewSummaryCards
        totalMonthlyIncomeAud={totalMonthlyIncomeAud}
        totalAllocatedMonthly={totalAllocatedMonthly}
        netSurplus={netSurplus}
      />

      <div className="flex flex-col gap-6 w-full">
        {/* Everyday Spending Categories */}
        <SetupReviewCategoryList
          title={t("setup.reviewSummary.everydaySpending")}
          totalMonthly={totalEverydayMonthly}
          categories={activeEveryday}
          categoryFrequencies={categoryFrequencies}
          setCategoryFrequencies={setCategoryFrequencies}
          setAmountOverrides={setAmountOverrides}
          onRemoveCategory={handleAttemptRemove}
          convertToMonthly={convertToMonthly}
          convertFromMonthly={convertFromMonthly}
        />

        {/* Regular Bills List */}
        <SetupReviewCategoryList
          title={t("setup.reviewSummary.regularBills")}
          totalMonthly={totalRegularMonthly}
          categories={activeRegular}
          categoryFrequencies={categoryFrequencies}
          setCategoryFrequencies={setCategoryFrequencies}
          setAmountOverrides={setAmountOverrides}
          onRemoveCategory={handleAttemptRemove}
          convertToMonthly={convertToMonthly}
          convertFromMonthly={convertFromMonthly}
        />

        {/* Savings Goals */}
        <SetupReviewGoalsList
          activeGoals={activeGoals}
          goals={goals}
          totalGoalMonthly={totalGoalMonthly}
          onRemoveCategory={handleAttemptRemove}
        />

        {/* Add Custom Category Form */}
        <SetupReviewCustomCategoryForm
          customCatName={customCatName}
          setCustomCatName={setCustomCatName}
          customCatType={customCatType}
          setCustomCatType={setCustomCatType}
          customCatAmount={customCatAmount}
          setCustomCatAmount={setCustomCatAmount}
          onAddCustomCategory={onAddCustomCategory}
        />
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 cursor-pointer"
        >
          {t("common.back")}
        </button>
        <div className="flex items-center gap-3">
          {onSimulatePayday && !isRerun && (
            <button
              type="button"
              onClick={onSimulatePayday}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#2563eb] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {t("setup.complete.simulateFirstPayday")}
            </button>
          )}
          <Button
            type="button"
            onClick={onFinish}
            loading={isSubmitting}
          >
            {isRerun
              ? t("setup.reviewSummary.recalibrateBudget")
              : t("setup.reviewSummary.saveBudget")}
          </Button>
        </div>
      </div>
    </div>
  );
}
