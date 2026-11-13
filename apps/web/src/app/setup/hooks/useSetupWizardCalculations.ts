"use client";

import { useMemo } from "react";
import {
  QuizAnswers,
  calculateQuizEstimates,
  EstimatedCategoryItem,
  UserGoalItem,
} from "@money-matters/types";

interface CalculationsProps {
  quizAnswers: QuizAnswers;
  isRerun: boolean;
  goals?: UserGoalItem[];
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
  billTypeOverrides?: Record<string, "RECURRING" | "TARGET_BALANCE">;
}

function getGoalMonthsDiff(targetDateStr?: string | null): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function useSetupWizardCalculations({
  quizAnswers,
  isRerun,
  goals = [],
  customCategories,
  removedCategoryNames,
  amountOverrides,
  billTypeOverrides = {},
}: CalculationsProps) {
  const estimation = useMemo(() => calculateQuizEstimates(quizAnswers), [quizAnswers]);

  const activeGoals: EstimatedCategoryItem[] = useMemo(() => {
    return goals
      .filter((g) => !removedCategoryNames.has(g.name))
      .map((g) => {
        const isOngoing = g.fundingMode === "RECURRING" || (!g.dueDate && Boolean(g.budgetFrequency));
        const override = amountOverrides[g.name];
        let baseMonthly = 0;
        if (isOngoing) {
          const rawAmt = g.enteredAmount !== undefined && g.enteredAmount !== null ? g.enteredAmount : (g.monthlyAmount || g.targetAmount || 0);
          if (g.budgetFrequency === "WEEKLY") baseMonthly = Math.round((rawAmt * 52) / 12);
          else if (g.budgetFrequency === "FORTNIGHTLY") baseMonthly = Math.round((rawAmt * 26) / 12);
          else if (g.budgetFrequency === "QUARTERLY") baseMonthly = Math.round((rawAmt * 4) / 12);
          else if (g.budgetFrequency === "ANNUALLY") baseMonthly = Math.round(rawAmt / 12);
          else baseMonthly = Math.round(rawAmt);
        } else {
          baseMonthly = Math.round((g.targetAmount || 0) / getGoalMonthsDiff(g.dueDate));
        }
        return {
          id: g.id,
          name: g.name,
          type: "GOAL" as const,
          envelopeType: "GOAL" as const,
          fundingMode: isOngoing ? ("RECURRING" as const) : ("TARGET_BALANCE" as const),
          isPriority: g.isPriority ?? true,
          isSurplusTarget: g.isSurplusTarget,
          isPrivate: g.isPrivate,
          bankAccountId: g.bankAccountId,
          targetAmount: g.targetAmount,
          enteredAmount: g.enteredAmount,
          budgetFrequency: g.budgetFrequency,
          startDate: g.startDate,
          endDate: g.dueDate,
          rrule: g.rrule,
          currentBalance: g.currentBalance,
          monthlyAud: override !== undefined ? override : baseMonthly,
          icon: g.icon || "target",
        };
      });
  }, [goals, removedCategoryNames, amountOverrides]);

  const activeCategories = useMemo(() => {
    const customNonGoals = customCategories.filter((c) => c.type !== "GOAL");
    const customNamesLower = new Set(customNonGoals.map((c) => c.name.trim().toLowerCase()));

    const nonGoalCategories = isRerun
      ? customNonGoals
      : [
          ...estimation.regularBills.filter((b) => !customNamesLower.has(b.name.trim().toLowerCase())),
          ...estimation.everydayCategories.filter((e) => !customNamesLower.has(e.name.trim().toLowerCase())),
          ...customNonGoals,
        ];

    const mappedNonGoals = nonGoalCategories
      .filter((cat) => !removedCategoryNames.has(cat.name))
      .map((cat) => {
        const override = amountOverrides[cat.name];
        const typeOverride = billTypeOverrides[cat.name];
        const isEveryday = cat.type === "EVERYDAY";
        return {
          ...cat,
          envelopeType: isEveryday ? ("EVERYDAY" as const) : ("BILL" as const),
          fundingMode: typeOverride || cat.fundingMode || (isEveryday ? ("TARGET_BALANCE" as const) : ("RECURRING" as const)),
          monthlyAud: override !== undefined ? override : cat.monthlyAud,
        };
      });

    return [...mappedNonGoals, ...activeGoals];
  }, [
    isRerun,
    estimation.regularBills,
    estimation.everydayCategories,
    customCategories,
    removedCategoryNames,
    amountOverrides,
    billTypeOverrides,
    activeGoals,
  ]);

  const activeEveryday = useMemo(
    () => activeCategories.filter((c) => c.type === "EVERYDAY"),
    [activeCategories]
  );
  const activeRegular = useMemo(
    () => activeCategories.filter((c) => c.type === "BILL"),
    [activeCategories]
  );

  const totalEverydayMonthly = useMemo(
    () => activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeEveryday]
  );
  const totalRegularMonthly = useMemo(
    () => activeRegular.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeRegular]
  );
  const totalGoalMonthly = useMemo(
    () => activeGoals.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeGoals]
  );

  const totalAllocatedMonthly = useMemo(
    () => totalEverydayMonthly + totalRegularMonthly + totalGoalMonthly,
    [totalEverydayMonthly, totalRegularMonthly, totalGoalMonthly]
  );

  const convertToMonthly = (
    amount: number,
    freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  ): number => {
    let result = amount;
    if (freq === "WEEKLY") result = amount * (52 / 12);
    else if (freq === "FORTNIGHTLY") result = amount * (26 / 12);
    else if (freq === "QUARTERLY") result = amount / 3;
    else if (freq === "YEARLY") result = amount / 12;
    return Math.round(result * 100) / 100;
  };

  const convertFromMonthly = (
    monthlyAmount: number,
    freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  ): number => {
    let result = monthlyAmount;
    if (freq === "WEEKLY") result = monthlyAmount / (52 / 12);
    else if (freq === "FORTNIGHTLY") result = monthlyAmount / (26 / 12);
    else if (freq === "QUARTERLY") result = monthlyAmount * 3;
    else if (freq === "YEARLY") result = monthlyAmount * 12;
    return Math.round(result * 100) / 100;
  };

  return {
    estimation,
    activeCategories,
    activeEveryday,
    activeRegular,
    activeGoals,
    totalEverydayMonthly,
    totalRegularMonthly,
    totalGoalMonthly,
    totalAllocatedMonthly,
    convertToMonthly,
    convertFromMonthly,
  };
}
