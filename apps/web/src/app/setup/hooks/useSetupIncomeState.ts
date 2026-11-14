"use client";
import { getTenantDateString } from "@money-matters/core";


import { useState } from "react";
import { IncomeItem } from "@money-matters/types";

export interface UseSetupIncomeStateOptions {
  onProceedToNextStep: () => void;
}

export function useSetupIncomeState({
  onProceedToNextStep,
}: UseSetupIncomeStateOptions) {
  const [incomes, setIncomes] = useState<IncomeItem[]>([
    {
      id: "inc-1",
      name: "Primary Income",
      amount: 3200,
      frequency: "FORTNIGHTLY",
      type: "SALARY",
      startDate: getTenantDateString(new Date()),
    },
  ]);
  const [archivedIncomeIds, setArchivedIncomeIds] = useState<Set<string>>(new Set());
  const [dirtyIncomeIds, setDirtyIncomeIds] = useState<Set<string>>(new Set());

  const handleUpdateIncomeField = <K extends keyof IncomeItem>(id: string, field: K, value: IncomeItem[K]) => {
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: value } : inc)));
    if (!id.startsWith("inc-")) {
      setDirtyIncomeIds((prev) => new Set(prev).add(id));
    }
  };

  const handleRemoveIncome = (id: string) => {
    if (!id.startsWith("inc-")) {
      setArchivedIncomeIds((prev) => new Set(prev).add(id));
    }
    setIncomes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNextFromIncomes = () => {
    onProceedToNextStep();
  };

  return {
    incomes,
    setIncomes,
    archivedIncomeIds,
    dirtyIncomeIds,
    handleUpdateIncomeField,
    handleRemoveIncome,
    handleNextFromIncomes,
  };
}
