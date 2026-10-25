"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { useToast, parseRecurrenceRule } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import {
  QuizAnswers,
  EstimatedCategoryItem,
  IncomeItem,
  getDefaultAccountName,
} from "@money-matters/types";
import { UserGoalItem } from "../components/SetupGoalsStep";
import { BankAccountRowItem } from "../components/SetupBankAccountRow";
import { useSetupWizardCalculations } from "./useSetupWizardCalculations";
import { useSetupWizardPrepopulation } from "./useSetupWizardPrepopulation";
import { useSetupWizardSubmission } from "./useSetupWizardSubmission";
import { useSetupLifestyleState } from "./useSetupLifestyleState";
import { useSetupSweepQueue } from "./useSetupSweepQueue";

export function useSetupWizardState() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const tenantQuery = trpc.getTenant.useQuery();
  const updatePrefMut = trpc.updateUserPreferences.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  const [step, setStep] = useState(1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Re-run mode & auto-trigger when setup was already completed
  const isRerunParam = searchParams?.get("mode") === "rerun";
  const setupAlreadyCompleted = Boolean(userPrefQuery.data?.setupCompleted);
  const isRerun = isRerunParam || setupAlreadyCompleted;

  useEffect(() => {
    if (setupAlreadyCompleted && !isRerunParam) router.replace("/setup?mode=rerun");
  }, [setupAlreadyCompleted, isRerunParam, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDiscardModal(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lifestyle = useSetupLifestyleState();
  const { setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal } = lifestyle;

  useEffect(() => {
    const tenantCountry = tenantQuery.data?.country;
    if (tenantCountry) {
      const normalizedCountry: "AU" | "NZ" | "OTHER" =
        tenantCountry === "AU" || tenantCountry === "NZ" ? tenantCountry : "OTHER";
      setCountry(normalizedCountry);
      if (normalizedCountry !== "AU") {
        setWeeklyGroceries(0);
        setWeeklyDining(0);
        setWeeklyPersonal(0);
      }
    }
  }, [tenantQuery.data?.country, setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal]);

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

  const [bankAccounts, setBankAccounts] = useState<BankAccountRowItem[]>([
    {
      id: "acc-default",
      name: getDefaultAccountName("Other", "EVERYDAY"),
      bankProvider: "Other",
      accountType: "EVERYDAY",
      lastKnownBalance: "1000.00",
      unbudgetedBuffer: "0.00",
      isPrivate: false,
    },
  ]);
  const [archivedAccountIds, setArchivedAccountIds] = useState<Set<string>>(new Set());

  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: "g-1",
      name: "Emergency Reserve",
      monthlyAmount: 300,
      icon: "shield",
      targetAmount: 10000,
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

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatType, setCustomCatType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [customCatAmount, setCustomCatAmount] = useState("100");
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>({});

  const prepopulation = useSetupWizardPrepopulation({
    isRerun,
    setIncomes,
    setBankAccounts,
    setGoals,
    setCustomCategories,
  });

  const sweepPools = useMemo(
    () =>
      prepopulation.pools.map((p) => ({
        id: p.id,
        name: p.name,
        currentBalance: p.currentBalance,
        isSurplusTarget: p.isSurplusTarget ?? false,
      })),
    [prepopulation.pools]
  );

  const sweep = useSetupSweepQueue(sweepPools, setGoals);

  const quizAnswers: QuizAnswers = useMemo(
    () => ({
      country: lifestyle.country,
      incomes,
      housingType: lifestyle.housingType,
      hasCars: lifestyle.hasCars,
      vehicles: lifestyle.vehicles,
      usePublicTransport: lifestyle.usePublicTransport,
      useRideshare: lifestyle.useRideshare,
      hasKids: lifestyle.hasKids,
      children: lifestyle.children,
      hasPrivateHealth: lifestyle.hasPrivateHealth,
      hasGym: lifestyle.hasGym,
      hasPets: lifestyle.hasPets,
      petsCount: lifestyle.petsCount,
      activeDebtMonthlyRepayment: lifestyle.debtMonthlyRepayment,
      givesCharity: lifestyle.hasCharityGiving,
      familySupportMonthlyAmount: lifestyle.charityMonthlyAmount,
      weeklyGroceries: lifestyle.weeklyGroceries,
      weeklyDining: lifestyle.weeklyDining,
      weeklyPersonal: lifestyle.weeklyPersonal,
    }),
    [lifestyle, incomes]
  );

  const calculations = useSetupWizardCalculations({
    quizAnswers,
    isRerun,
    goals,
    customCategories,
    removedCategoryNames,
    amountOverrides,
  });

  const submission = useSetupWizardSubmission({
    isRerun,
    incomes,
    bankAccounts,
    activeCategories: calculations.activeCategories,
    goals,
    categoryFrequencies,
    sweepQueue: sweep.sweepQueue,
    removedCategoryNames,
    archivedAccountIds,
    archivedIncomeIds,
    existingPools: prepopulation.pools,
  });

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
      const pool = prepopulation.pools.find((p) => p.id === id);
      const balance = pool ? pool.currentBalance || 0 : 0;
      if (balance > 0.005) {
        sweep.handleRemoveGoal(id);
        return;
      }
      if (isRerun) {
        await archivePoolMut.mutateAsync({ poolId: id });
      }
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const [showScheduleRuleWarning, setShowScheduleRuleWarning] = useState(false);
  const [pendingNextAction, setPendingNextAction] = useState<(() => Promise<void>) | null>(null);

  const handleNextFromIncomes = async () => {
    if (isRerun && dirtyIncomeIds.size > 0) {
      // Check if any existing income has frequency/startDate changes
      let ruleChanged = false;
      for (const id of dirtyIncomeIds) {
        const item = incomes.find((inc) => inc.id === id);
        const original = prepopulation.incomeSources.find((s) => s.id === id);
        if (item && original) {
          const parsed = parseRecurrenceRule(original.rrule);
          if (item.frequency !== parsed.frequency || (item.startDate || "") !== (original.startDate || "")) {
            ruleChanged = true;
            break;
          }
        }
      }

      const saveAndProceed = async () => {
        await Promise.all(Array.from(dirtyIncomeIds).map((id) => handleSaveIncomeImmediate(id)));
        toast.success(t("toasts.saved"));
        setStep(2);
      };

      if (ruleChanged) {
        setPendingNextAction(() => saveAndProceed);
        setShowScheduleRuleWarning(true);
        return;
      }

      await saveAndProceed();
      return;
    }
    setStep(2);
  };

  const handleNextFromGoals = async () => {
    if (isRerun && dirtyGoalIds.size > 0) {
      await Promise.all(Array.from(dirtyGoalIds).map((id) => handleSaveGoalImmediate(id)));
      toast.success(t("toasts.saved"));
    }
    setStep(isRerun ? 3 : 4);
  };

  const handleAddAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        id: `acc-${Date.now()}`,
        name: getDefaultAccountName("Other", "EVERYDAY"),
        bankProvider: "Other",
        accountType: "EVERYDAY",
        lastKnownBalance: "0.00",
        unbudgetedBuffer: "0.00",
        isPrivate: false,
      },
    ]);
  };

  const handleUpdateAccount = (
    acc: BankAccountRowItem,
    field: "name" | "bankProvider" | "accountType" | "lastKnownBalance" | "unbudgetedBuffer" | "isPrivate",
    value: string | boolean
  ) => {
    setBankAccounts((prev) =>
      prev.map((item) => (item.id === acc.id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveAccount = (id: string) => {
    if (!id.startsWith("acc-")) setArchivedAccountIds((prev) => new Set(prev).add(id));
    setBankAccounts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDiscard = async () => {
    setShowDiscardModal(false);
    try {
      await updatePrefMut.mutateAsync({ setupCompleted: true });
    } catch (_e) {
      // Ignore if preference update fails
    }
    router.replace("/dashboard");
  };

  return {
    router,
    isRerun,
    isLoading: prepopulation.isLoading,
    step,
    setStep,
    isSubmitting: submission.isSubmitting,
    showDiscardModal,
    setShowDiscardModal,
    goals,
    setGoals,
    dirtyGoalIds,
    handleUpdateGoal: handleUpdateGoalField,
    handleSaveGoalImmediate,
    handleRemoveGoal,
    handleNextFromGoals,
    sweepQueue: sweep.sweepQueue,
    activeSweepPool: sweep.activeSweepPool,
    setActiveSweepPool: sweep.setActiveSweepPool,
    selectedSweepDest: sweep.selectedSweepDest,
    setSelectedSweepDest: sweep.setSelectedSweepDest,
    confirmSweepAndRemove: sweep.confirmSweepAndRemove,
    availablePools: prepopulation.pools,
    incomes,
    setIncomes,
    dirtyIncomeIds,
    handleUpdateIncome: handleUpdateIncomeField,
    handleSaveIncomeImmediate,
    handleRemoveIncome,
    handleNextFromIncomes,
    bankAccounts,
    setBankAccounts,
    handleAddAccount,
    handleUpdateAccount,
    handleRemoveAccount,
    customCategories,
    setCustomCategories,
    customCatName,
    setCustomCatName,
    customCatType,
    setCustomCatType,
    customCatAmount,
    setCustomCatAmount,
    removedCategoryNames,
    setRemovedCategoryNames,
    amountOverrides,
    setAmountOverrides,
    categoryFrequencies,
    setCategoryFrequencies,
    showIcons: userPrefQuery.data?.showIcons ?? true,
    showScheduleRuleWarning,
    confirmScheduleRuleWarning: async () => {
      setShowScheduleRuleWarning(false);
      if (pendingNextAction) {
        await pendingNextAction();
        setPendingNextAction(null);
      }
    },
    cancelScheduleRuleWarning: () => {
      setShowScheduleRuleWarning(false);
      setPendingNextAction(null);
    },
    ...lifestyle,
    ...calculations,
    handleFinish: submission.handleFinish,
    handleDiscard,
  };
}
