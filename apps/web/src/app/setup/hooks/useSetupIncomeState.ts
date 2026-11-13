"use client";

import { useState } from "react";
import { parseRecurrenceRule } from "@money-matters/ui/web";
import { IncomeItem } from "@money-matters/types";

export interface UseSetupIncomeStateOptions {
  isRerun: boolean;
  prepopulationIncomeSources: Array<{ id: string; rrule?: string | null; startDate?: string | null }>;
  onProceedToNextStep: () => void;
}

export function useSetupIncomeState({
  isRerun,
  prepopulationIncomeSources,
  onProceedToNextStep,
}: UseSetupIncomeStateOptions) {
  const [incomes, setIncomes] = useState<IncomeItem[]>([
    {
      id: "inc-1",
      name: "Primary Income",
      amount: 3200,
      frequency: "FORTNIGHTLY",
      type: "SALARY",
      startDate: new Intl.DateTimeFormat("en-CA").format(new Date()),
    },
  ]);
  const [archivedIncomeIds, setArchivedIncomeIds] = useState<Set<string>>(new Set());
  const [dirtyIncomeIds, setDirtyIncomeIds] = useState<Set<string>>(new Set());

  const [showScheduleRuleWarning, setShowScheduleRuleWarning] = useState(false);

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
    if (isRerun && dirtyIncomeIds.size > 0) {
      let ruleChanged = false;
      for (const id of dirtyIncomeIds) {
        const item = incomes.find((inc) => inc.id === id);
        const original = prepopulationIncomeSources.find((s) => s.id === id);
        if (item && original) {
          const parsed = parseRecurrenceRule(original.rrule || "");
          if (item.frequency !== parsed.frequency || (item.startDate || "") !== (original.startDate || "")) {
            ruleChanged = true;
            break;
          }
        }
      }

      if (ruleChanged) {
        setShowScheduleRuleWarning(true);
        return;
      }
    }
    onProceedToNextStep();
  };

  const confirmScheduleRuleWarning = () => {
    setShowScheduleRuleWarning(false);
    onProceedToNextStep();
  };

  const cancelScheduleRuleWarning = () => {
    setShowScheduleRuleWarning(false);
  };

  return {
    incomes,
    setIncomes,
    archivedIncomeIds,
    dirtyIncomeIds,
    handleUpdateIncomeField,
    handleRemoveIncome,
    handleNextFromIncomes,
    showScheduleRuleWarning,
    confirmScheduleRuleWarning,
    cancelScheduleRuleWarning,
  };
}
