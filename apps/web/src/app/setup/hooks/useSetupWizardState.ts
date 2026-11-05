"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import {
  QuizAnswers,
  EstimatedCategoryItem,
} from "@money-matters/types";
import { useSetupWizardCalculations } from "./useSetupWizardCalculations";
import { useSetupWizardPrepopulation } from "./useSetupWizardPrepopulation";
import { useSetupWizardSubmission } from "./useSetupWizardSubmission";
import { useSetupLifestyleState } from "./useSetupLifestyleState";
import { useSetupSweepQueue } from "./useSetupSweepQueue";
import { useSetupAccountsState } from "./useSetupAccountsState";
import { useSetupIncomeState } from "./useSetupIncomeState";
import { useSetupGoalsState } from "./useSetupGoalsState";

export function useSetupWizardState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const tenantQuery = trpc.getTenant.useQuery();
  const updatePrefMut = trpc.updateUserPreferences.useMutation();

  const [step, setStep] = useState(1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Re-run mode & auto-trigger when setup was already completed - locked on mount to prevent submission flicker
  const isRerunParam = searchParams?.get("mode") === "rerun";
  const setupAlreadyCompleted = Boolean(userPrefQuery.data?.setupCompleted);
  const [isRerun, setIsRerun] = useState<boolean>(() => isRerunParam || setupAlreadyCompleted);
  const initialSetupCompletedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (initialSetupCompletedRef.current === null && userPrefQuery.data !== undefined) {
      initialSetupCompletedRef.current = Boolean(userPrefQuery.data?.setupCompleted);
      if (initialSetupCompletedRef.current && !isRerunParam) {
        setIsRerun(true);
        router.replace("/setup?mode=rerun");
      }
    }
  }, [userPrefQuery.data, isRerunParam, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDiscardModal(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lifestyle = useSetupLifestyleState();
  const { setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal } = lifestyle;

  const accounts = useSetupAccountsState();
  const { bankAccounts, setBankAccounts, archivedAccountIds } = accounts;

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatType, setCustomCatType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [customCatAmount, setCustomCatAmount] = useState("100");
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [billTypeOverrides, setBillTypeOverrides] = useState<Record<string, "SCHEDULED_BILL" | "FLEXIBLE_BILL">>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>({});

  // Prepopulation query
  const prepopulation = useSetupWizardPrepopulation({
    isRerun,
    setIncomes: (val) => incomeState.setIncomes(val),
    setBankAccounts,
    setGoals: (val) => goalsState.setGoals(val),
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

  const sweep = useSetupSweepQueue(sweepPools, (val) => goalsState.setGoals(val));

  const incomeState = useSetupIncomeState({
    isRerun,
    prepopulationIncomeSources: prepopulation.incomeSources,
    onProceedToNextStep: () => setStep(2),
  });

  const goalsState = useSetupGoalsState({
    isRerun,
    prepopulationPools: prepopulation.pools,
    onSweepRemoveGoal: (id) => sweep.handleRemoveGoal(id),
    onProceedToNextStep: () => setStep(isRerun ? 3 : 4),
  });

  const { incomes } = incomeState;
  const { goals } = goalsState;

  const isAud = tenantQuery.data?.currency ? tenantQuery.data.currency === "AUD" : true;

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
    const tenantCurrency = tenantQuery.data?.currency;
    if (tenantCurrency && tenantCurrency !== "AUD" && !isRerun) {
      incomeState.setIncomes((prev) =>
        prev.map((inc) => (inc.id === "inc-1" && inc.amount === 3200 ? { ...inc, amount: 0 } : inc))
      );
      setBankAccounts((prev) =>
        prev.map((acc) => (acc.id === "acc-default" && acc.lastKnownBalance === "1000.00" ? { ...acc, lastKnownBalance: "0.00" } : acc))
      );
      goalsState.setGoals((prev) =>
        prev.map((g) => {
          if (g.id === "g-1" && g.targetAmount === 10000) {
            return { ...g, monthlyAmount: 0, targetAmount: 0, enteredAmount: 0 };
          }
          if (g.id === "g-2" && g.targetAmount === 3000) {
            return { ...g, monthlyAmount: 0, targetAmount: 0 };
          }
          return g;
        })
      );
      setWeeklyGroceries(0);
      setWeeklyDining(0);
      setWeeklyPersonal(0);
    }
  }, [tenantQuery.data?.country, tenantQuery.data?.currency, isRerun, setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal, setBankAccounts, incomeState, goalsState]);

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
    billTypeOverrides,
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
    archivedIncomeIds: incomeState.archivedIncomeIds,
    existingPools: prepopulation.pools,
  });

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
    setGoals: goalsState.setGoals,
    dirtyGoalIds: goalsState.dirtyGoalIds,
    handleUpdateGoal: goalsState.handleUpdateGoalField,
    handleSaveGoalImmediate: goalsState.handleSaveGoalImmediate,
    handleRemoveGoal: goalsState.handleRemoveGoal,
    handleNextFromGoals: goalsState.handleNextFromGoals,
    sweepQueue: sweep.sweepQueue,
    activeSweepPool: sweep.activeSweepPool,
    setActiveSweepPool: sweep.setActiveSweepPool,
    selectedSweepDest: sweep.selectedSweepDest,
    setSelectedSweepDest: sweep.setSelectedSweepDest,
    confirmSweepAndRemove: sweep.confirmSweepAndRemove,
    availablePools: prepopulation.pools,
    incomes,
    setIncomes: incomeState.setIncomes,
    dirtyIncomeIds: incomeState.dirtyIncomeIds,
    handleUpdateIncome: incomeState.handleUpdateIncomeField,
    handleSaveIncomeImmediate: incomeState.handleSaveIncomeImmediate,
    handleRemoveIncome: incomeState.handleRemoveIncome,
    handleNextFromIncomes: incomeState.handleNextFromIncomes,
    bankAccounts,
    setBankAccounts,
    handleAddAccount: accounts.handleAddAccount,
    handleUpdateAccount: accounts.handleUpdateAccount,
    handleRemoveAccount: accounts.handleRemoveAccount,
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
    billTypeOverrides,
    setBillTypeOverrides,
    categoryFrequencies,
    setCategoryFrequencies,
    showIcons: userPrefQuery.data?.showIcons ?? true,
    showScheduleRuleWarning: incomeState.showScheduleRuleWarning,
    confirmScheduleRuleWarning: incomeState.confirmScheduleRuleWarning,
    cancelScheduleRuleWarning: incomeState.cancelScheduleRuleWarning,
    ...lifestyle,
    ...calculations,
    isAud,
    handleFinish: submission.handleFinish,
    handleDiscard,
  };
}
