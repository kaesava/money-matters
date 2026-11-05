"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { useToast, parseRecurrenceRule } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
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
  const toast = useToast();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();

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
  const [pendingNextAction, setPendingNextAction] = useState<(() => Promise<void>) | null>(null);

  const handleUpdateIncomeField = <K extends keyof IncomeItem>(id: string, field: K, value: IncomeItem[K]) => {
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: value } : inc)));
    if (!id.startsWith("inc-")) {
      setDirtyIncomeIds((prev) => new Set(prev).add(id));
    }
  };

  const handleSaveIncomeImmediate = async (id: string) => {
    if (id.startsWith("inc-")) return;
    const target = incomes.find((inc) => inc.id === id);
    if (!target) return;
    const rawFreq = target.frequency as string;
    const frequencyVal: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" =
      rawFreq === "WEEKLY" || rawFreq === "FORTNIGHTLY" ? rawFreq : "MONTHLY";
    await updateIncomeMut.mutateAsync({
      id,
      data: {
        name: target.name,
        amount: String(target.amount || 0),
        frequency: frequencyVal,
        startDate: target.startDate || undefined,
      },
    });
    setDirtyIncomeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRemoveIncome = async (id: string) => {
    if (!id.startsWith("inc-")) {
      if (isRerun) {
        await archiveIncomeMut.mutateAsync({ id });
      }
      setArchivedIncomeIds((prev) => new Set(prev).add(id));
    }
    setIncomes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNextFromIncomes = async () => {
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

      const saveAndProceed = async () => {
        await Promise.all(Array.from(dirtyIncomeIds).map((id) => handleSaveIncomeImmediate(id)));
        toast.success(t("toasts.saved"));
        onProceedToNextStep();
      };

      if (ruleChanged) {
        setPendingNextAction(() => saveAndProceed);
        setShowScheduleRuleWarning(true);
        return;
      }

      await saveAndProceed();
      return;
    }
    onProceedToNextStep();
  };

  const confirmScheduleRuleWarning = async () => {
    setShowScheduleRuleWarning(false);
    if (pendingNextAction) {
      await pendingNextAction();
      setPendingNextAction(null);
    }
  };

  const cancelScheduleRuleWarning = () => {
    setShowScheduleRuleWarning(false);
    setPendingNextAction(null);
  };

  return {
    incomes,
    setIncomes,
    archivedIncomeIds,
    dirtyIncomeIds,
    handleUpdateIncomeField,
    handleSaveIncomeImmediate,
    handleRemoveIncome,
    handleNextFromIncomes,
    showScheduleRuleWarning,
    confirmScheduleRuleWarning,
    cancelScheduleRuleWarning,
  };
}
