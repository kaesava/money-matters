"use client";

import { useMemo } from "react";
import {
  QuizAnswers,
  calculateQuizEstimates,
  EstimatedCategoryItem,
} from "@money-matters/types";

interface CalculationsProps {
  quizAnswers: QuizAnswers;
  isRerun: boolean;
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
}

export function useSetupWizardCalculations({
  quizAnswers,
  isRerun,
  customCategories,
  removedCategoryNames,
  amountOverrides,
}: CalculationsProps) {
  const estimation = useMemo(() => calculateQuizEstimates(quizAnswers), [quizAnswers]);

  const activeCategories = useMemo(() => {
    const combined = isRerun
      ? customCategories
      : [
          ...estimation.regularBills,
          ...estimation.goalSinkingFunds,
          ...estimation.everydayCategories,
          ...customCategories,
        ];

    return combined
      .filter((cat) => !removedCategoryNames.has(cat.name))
      .map((cat) => {
        const override = amountOverrides[cat.name];
        return {
          ...cat,
          monthlyAud: override !== undefined ? override : cat.monthlyAud,
        };
      });
  }, [
    isRerun,
    estimation.regularBills,
    estimation.goalSinkingFunds,
    estimation.everydayCategories,
    customCategories,
    removedCategoryNames,
    amountOverrides,
  ]);

  const activeEveryday = useMemo(
    () => activeCategories.filter((c) => c.type === "EVERYDAY"),
    [activeCategories]
  );
  const activeRegular = useMemo(
    () => activeCategories.filter((c) => c.type === "REGULAR"),
    [activeCategories]
  );
  const activeGoals = useMemo(
    () => activeCategories.filter((c) => c.type === "GOAL"),
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
    freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY"
  ): number => {
    if (freq === "WEEKLY") return Math.round(amount * (52 / 12));
    if (freq === "FORTNIGHTLY") return Math.round(amount * (26 / 12));
    if (freq === "YEARLY") return Math.round(amount / 12);
    return Math.round(amount);
  };

  const convertFromMonthly = (
    monthlyAmount: number,
    freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY"
  ): number => {
    if (freq === "WEEKLY") return Math.round(monthlyAmount / (52 / 12));
    if (freq === "FORTNIGHTLY") return Math.round(monthlyAmount / (26 / 12));
    if (freq === "YEARLY") return Math.round(monthlyAmount * 12);
    return Math.round(monthlyAmount);
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
