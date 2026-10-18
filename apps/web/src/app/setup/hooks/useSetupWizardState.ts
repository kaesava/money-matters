"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
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
  const searchParams = useSearchParams();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updatePrefMut = trpc.updateUserPreferences.useMutation();

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

  const [incomes, setIncomes] = useState<IncomeItem[]>([
    {
      id: "inc-1",
      name: "Primary Income",
      amount: 3200,
      frequency: "FORTNIGHTLY",
      type: "SALARY",
      startDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date()),
    },
  ]);
  const [archivedIncomeIds, setArchivedIncomeIds] = useState<Set<string>>(new Set());

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
      dueDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      ),
    },
  ]);

  const lifestyle = useSetupLifestyleState();
  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatType, setCustomCatType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [customCatAmount, setCustomCatAmount] = useState("100");
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>({});
  const [autoCreateExpenseSchedules, setAutoCreateExpenseSchedules] = useState(true);

  const { pools } = useSetupWizardPrepopulation({
    isRerun,
    setIncomes,
    setBankAccounts,
    setGoals,
    setCustomCategories,
  });

  const sweep = useSetupSweepQueue(pools, setGoals);

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
    archivedAccountIds,
    archivedIncomeIds,
    autoCreateExpenseSchedules,
  });

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

  const handleRemoveIncome = (id: string) => {
    if (!id.startsWith("inc-")) setArchivedIncomeIds((prev) => new Set(prev).add(id));
    setIncomes((prev) => prev.filter((item) => item.id !== id));
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
    step,
    setStep,
    isSubmitting: submission.isSubmitting,
    showDiscardModal,
    setShowDiscardModal,
    goals,
    setGoals,
    ...sweep,
    availablePools: pools,
    incomes,
    setIncomes,
    handleRemoveIncome,
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
    autoCreateExpenseSchedules,
    setAutoCreateExpenseSchedules,
    showIcons: userPrefQuery.data?.showIcons ?? true,
    ...lifestyle,
    ...calculations,
    handleFinish: submission.handleFinish,
    handleDiscard,
  };
}
