"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { UserGoalItem } from "../components/SetupGoalsStep";

export interface UseSetupGoalsStateOptions {
  isRerun: boolean;
  prepopulationPools: Array<{ id: string; currentBalance?: number | null }>;
  onSweepRemoveGoal: (id: string) => void;
  onProceedToNextStep: () => void;
}

export function useSetupGoalsState({
  isRerun,
  prepopulationPools,
  onSweepRemoveGoal,
  onProceedToNextStep,
}: UseSetupGoalsStateOptions) {
  const toast = useToast();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: "g-1",
      name: "Emergency Reserve",
      monthlyAmount: 300,
      icon: "shield",
      targetAmount: 10000,
      enteredAmount: 300,
      goalMode: "ONGOING",
      budgetFrequency: "MONTHLY",
    },
    {
      id: "g-2",
      name: "Annual Family Holiday",
      monthlyAmount: 250,
      icon: "plane",
      targetAmount: 3000,
      goalMode: "TARGET_DATE",
      dueDate: new Intl.DateTimeFormat("en-CA").format(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      ),
    },
  ]);
  const [dirtyGoalIds, setDirtyGoalIds] = useState<Set<string>>(new Set());

  const handleUpdateGoalField = (id: string, field: keyof UserGoalItem, value: string | number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
    if (!id.startsWith("g-")) {
      setDirtyGoalIds((prev) => new Set(prev).add(id));
    }
  };

  const handleSaveGoalImmediate = async (id: string) => {
    if (id.startsWith("g-")) return;
    const target = goals.find((g) => g.id === id);
    if (!target) return;
    const isOngoing = target.goalMode === "ONGOING";
    const amtStr = String(isOngoing ? target.monthlyAmount || target.targetAmount || 0 : target.targetAmount || 0);
    await updatePoolMut.mutateAsync({
      poolId: id,
      data: {
        name: target.name,
        targetAmount: amtStr,
        monthlyAmount: String(target.monthlyAmount || 0),
        enteredAmount: target.enteredAmount ? String(target.enteredAmount) : amtStr,
        budgetFrequency: target.budgetFrequency || "MONTHLY",
        endDate: isOngoing ? null : target.dueDate || null,
        goalMode: target.goalMode,
      },
    });
    setDirtyGoalIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRemoveGoal = async (id: string) => {
    if (!id.startsWith("g-")) {
      const pool = prepopulationPools.find((p) => p.id === id);
      const balance = pool ? pool.currentBalance || 0 : 0;
      if (balance > 0.005) {
        onSweepRemoveGoal(id);
        return;
      }
      if (isRerun) {
        await archivePoolMut.mutateAsync({ poolId: id });
      }
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleNextFromGoals = async () => {
    if (isRerun && dirtyGoalIds.size > 0) {
      await Promise.all(Array.from(dirtyGoalIds).map((id) => handleSaveGoalImmediate(id)));
      toast.success(t("toasts.saved"));
    }
    onProceedToNextStep();
  };

  return {
    goals,
    setGoals,
    dirtyGoalIds,
    handleUpdateGoalField,
    handleSaveGoalImmediate,
    handleRemoveGoal,
    handleNextFromGoals,
  };
}
