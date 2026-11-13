"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { EstimatedCategoryItem } from "@money-matters/types";
import { InfoTooltip, Button } from "@money-matters/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";
import { UserGoalItem } from "./SetupGoalsStep";
import { SetupReviewSummaryCards } from "./SetupReviewSummaryCards";
import { SetupReviewCategoryList } from "./SetupReviewCategoryList";
import { SetupReviewGoalsList } from "./SetupReviewGoalsList";

interface SetupCategoriesStepProps {
  activeEveryday: EstimatedCategoryItem[];
  activeRegular: EstimatedCategoryItem[];
  activeGoals: EstimatedCategoryItem[];
  goals?: UserGoalItem[];
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">>
  >;
  setAmountOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRemoveCategory: (name: string) => void;
  onOpenAddEnvelope: () => void;
  convertToMonthly: (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") => number;
  convertFromMonthly: (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") => number;
  totalMonthlyIncomeAud: number;
  totalAllocatedMonthly: number;
  totalEverydayMonthly: number;
  totalRegularMonthly: number;
  totalGoalMonthly: number;
  isSubmitting: boolean;
  onBack: () => void;
  onFinish: () => void;
  onSimulatePayday?: () => void;
  onToggleBillType?: (name: string, newType: "RECURRING" | "TARGET_BALANCE") => void;
  onEditCategory?: (category: EstimatedCategoryItem) => void;
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
  onOpenAddEnvelope,
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
  onToggleBillType,
  onEditCategory,
  isRerun = false,
}: SetupCategoriesStepProps) {
  const { currencySymbol } = useLocale();
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [everydayOpen, setEverydayOpen] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const handleAttemptRemove = (name: string) => {
    const allItems = [...activeEveryday, ...activeRegular, ...activeGoals];
    const matchedCat = allItems.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    const matchedGoal = goals.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedCat?.isSurplusTarget || matchedGoal?.isSurplusTarget) {
      setWarningMsg(t("setup.surplusTargetDeleteWarning", { name }));
      setTimeout(() => setWarningMsg(null), 4000);
      return;
    }
    onRemoveCategory(name);
  };

  const netSurplus = totalMonthlyIncomeAud - totalAllocatedMonthly;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-w-3xl mx-auto w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B]">
          {t("setup.reviewSummary.title")}
        </h2>
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

      <div className="flex flex-col gap-4 w-full">
        {/* Accordion 1: Everyday Spending Envelope */}
        <div className="rounded-2xl border border-zinc-200/80 bg-slate-50 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setEverydayOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-700">
                {t("setup.reviewSummary.everydaySpending")}
              </span>
              <span className="text-xs font-bold text-zinc-400">({activeEveryday.length})</span>
              <span onClick={(e) => e.stopPropagation()}>
                <InfoTooltip
                  title={t("setup.reviewSummary.everydayTooltipTitle")}
                  content={t("setup.reviewSummary.everydayTooltipContent")}
                />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {currencySymbol}{totalEverydayMonthly.toFixed(2)} {t("setup.freqSuffixMo")}
              </span>
              <span className="text-xs font-bold text-zinc-400">{everydayOpen ? "▲" : "▼"}</span>
            </div>
          </button>
          {everydayOpen && (
            <div className="p-4 pt-0 border-t border-zinc-200/50">
              <SetupReviewCategoryList
                title=""
                totalMonthly={totalEverydayMonthly}
                categories={activeEveryday}
                categoryFrequencies={categoryFrequencies}
                setCategoryFrequencies={setCategoryFrequencies}
                setAmountOverrides={setAmountOverrides}
                onRemoveCategory={handleAttemptRemove}
                convertToMonthly={convertToMonthly}
                convertFromMonthly={convertFromMonthly}
                onEditCategory={onEditCategory}
                isRerun={isRerun}
              />
            </div>
          )}
        </div>

        {/* Accordion 2: Regular & Flexible Bills */}
        <div className="rounded-2xl border border-zinc-200/80 bg-slate-50 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setBillsOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-700">
                {t("setup.reviewSummary.regularBills")}
              </span>
              <span className="text-xs font-bold text-zinc-400">({activeRegular.length})</span>
              <span onClick={(e) => e.stopPropagation()}>
                <InfoTooltip
                  title={t("setup.reviewSummary.billsTooltipTitle")}
                  content={t("setup.reviewSummary.billsTooltipContent")}
                />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {currencySymbol}{totalRegularMonthly.toFixed(2)} {t("setup.freqSuffixMo")}
              </span>
              <span className="text-xs font-bold text-zinc-400">{billsOpen ? "▲" : "▼"}</span>
            </div>
          </button>
          {billsOpen && (
            <div className="p-4 pt-0 border-t border-zinc-200/50">
              <SetupReviewCategoryList
                title=""
                totalMonthly={totalRegularMonthly}
                categories={activeRegular}
                categoryFrequencies={categoryFrequencies}
                setCategoryFrequencies={setCategoryFrequencies}
                setAmountOverrides={setAmountOverrides}
                onRemoveCategory={handleAttemptRemove}
                convertToMonthly={convertToMonthly}
                convertFromMonthly={convertFromMonthly}
                onToggleBillType={onToggleBillType}
                onEditCategory={onEditCategory}
                isRerun={isRerun}
              />
            </div>
          )}
        </div>

        {/* Accordion 3: Goals & Savings */}
        <div className="rounded-2xl border border-zinc-200/80 bg-slate-50 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setGoalsOpen((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-700">
                {t("setup.reviewSummary.savingsGoals")}
              </span>
              <span className="text-xs font-bold text-zinc-400">({activeGoals.length})</span>
              <span onClick={(e) => e.stopPropagation()}>
                <InfoTooltip
                  title={t("setup.reviewSummary.goalsTooltipTitle")}
                  content={t("setup.reviewSummary.goalsTooltipContent")}
                />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold font-mono text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                {currencySymbol}{totalGoalMonthly.toFixed(2)} {t("setup.freqSuffixMo")}
              </span>
              <span className="text-xs font-bold text-zinc-400">{goalsOpen ? "▲" : "▼"}</span>
            </div>
          </button>
          {goalsOpen && (
            <div className="p-4 pt-0 border-t border-zinc-200/50">
              <SetupReviewGoalsList
                activeGoals={activeGoals}
                goals={goals}
                totalGoalMonthly={totalGoalMonthly}
                onRemoveCategory={handleAttemptRemove}
                onEditGoal={onEditCategory}
                isRerun={isRerun}
              />
            </div>
          )}
        </div>

        {/* Canonical Add Envelope CTA */}
        <button
          type="button"
          onClick={onOpenAddEnvelope}
          className="w-full py-3 px-4 bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold rounded-2xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {t("setup.reviewSummary.addEnvelopeBtn")}
        </button>
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
