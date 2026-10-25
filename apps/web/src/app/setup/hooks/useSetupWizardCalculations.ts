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
  goals?: Array<{
    id: string;
    name: string;
    monthlyAmount: number;
    icon?: string;
    targetAmount?: number | null;
    dueDate?: string | null;
    goalMode?: "TARGET_DATE" | "ONGOING";
    enteredAmount?: number | null;
  }>;
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
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
}: CalculationsProps) {
  const estimation = useMemo(() => calculateQuizEstimates(quizAnswers), [quizAnswers]);

  const activeGoals: EstimatedCategoryItem[] = useMemo(() => {
    return goals
      .filter((g) => !removedCategoryNames.has(g.name))
      .map((g) => {
        const isOngoing = g.goalMode === "ONGOING";
        const override = amountOverrides[g.name];
        const baseMonthly = isOngoing
          ? g.enteredAmount !== undefined && g.enteredAmount !== null
            ? g.enteredAmount
            : g.monthlyAmount || g.targetAmount || 0
          : g.monthlyAmount || Math.round((g.targetAmount || 0) / getGoalMonthsDiff(g.dueDate));
        return {
          id: g.id,
          name: g.name,
          type: "GOAL" as const,
          monthlyAud: override !== undefined ? override : baseMonthly,
          icon: g.icon || "target",
        };
      });
  }, [goals, removedCategoryNames, amountOverrides]);

  const activeCategories = useMemo(() => {
    const nonGoalCategories = isRerun
      ? customCategories.filter((c) => c.type !== "GOAL")
      : [
          ...estimation.regularBills,
          ...estimation.everydayCategories,
          ...customCategories.filter((c) => c.type !== "GOAL"),
        ];

    const mappedNonGoals = nonGoalCategories
      .filter((cat) => !removedCategoryNames.has(cat.name))
      .map((cat) => {
        const override = amountOverrides[cat.name];
        return {
          ...cat,
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
    activeGoals,
  ]);

  const activeEveryday = useMemo(
    () => activeCategories.filter((c) => c.type === "EVERYDAY"),
    [activeCategories]
  );
  const activeRegular = useMemo(
    () => activeCategories.filter((c) => c.type === "REGULAR"),
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
