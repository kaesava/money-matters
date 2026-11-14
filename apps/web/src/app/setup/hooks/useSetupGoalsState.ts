"use client";
import { getTenantDateString } from "@money-matters/core";


import { useState } from "react";
import { UserGoalItem } from "../components/SetupGoalsStep";

export interface UseSetupGoalsStateOptions {
  onProceedToNextStep: () => void;
}

export function useSetupGoalsState({
  onProceedToNextStep,
}: UseSetupGoalsStateOptions) {
  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: "g-1",
      name: "Emergency Reserve",
      monthlyAmount: 300,
      icon: "shield",
      targetAmount: 10000,
      enteredAmount: 300,
      fundingMode: "RECURRING",
      isPriority: true,
      isSurplusTarget: true,
      budgetFrequency: "MONTHLY",
    },
    {
      id: "g-2",
      name: "Annual Family Holiday",
      monthlyAmount: 250,
      icon: "plane",
      targetAmount: 3000,
      fundingMode: "TARGET_BALANCE",
      isPriority: true,
      dueDate: getTenantDateString(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      ),
    },
  ]);
  const [archivedGoalIds, setArchivedGoalIds] = useState<Set<string>>(new Set());

  const handleUpdateGoalField = (id: string, field: keyof UserGoalItem, value: string | number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const handleRemoveGoal = (id: string) => {
    if (!id.startsWith("g-")) {
      setArchivedGoalIds((prev) => new Set(prev).add(id));
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleNextFromGoals = () => {
    onProceedToNextStep();
  };

  return {
    goals,
    setGoals,
    archivedGoalIds,
    handleUpdateGoalField,
    handleRemoveGoal,
    handleNextFromGoals,
  };
}
