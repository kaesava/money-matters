"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import {
  QuizAnswers,
  EstimatedCategoryItem,
} from "@money-matters/types";
import { useSetupWizardCalculations } from "./useSetupWizardCalculations";
import { useSetupWizardPrepopulation } from "./useSetupWizardPrepopulation";
import { useSetupWizardSubmission } from "./useSetupWizardSubmission";
import { useSetupLifestyleState } from "./useSetupLifestyleState";
import { useSetupBankAccountsState } from "./useSetupBankAccountsState";
import { useSetupIncomeState } from "./useSetupIncomeState";
import { useSetupGoalsState } from "./useSetupGoalsState";

export function useSetupWizardState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const createTenantMut = trpc.createTenant.useMutation();
  const hasTenant = tenantStatusQuery.data?.hasTenant === true;
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
  });
  const tenantQuery = trpc.getTenant.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
  });
  const cancelSetupMut = trpc.cancelSetup.useMutation();

  // Auto-provision tenant for authenticated users without a household (e.g. Google OAuth sign-in)
  const isCreatingTenantRef = useRef(false);
  useEffect(() => {
    if (
      tenantStatusQuery.data &&
      !tenantStatusQuery.data.hasTenant &&
      !isCreatingTenantRef.current
    ) {
      isCreatingTenantRef.current = true;
      createTenantMut
        .mutateAsync({
          name: "My Household",
          country: "AU",
          currency: "AUD",
          timezone: "Australia/Sydney",
        })
        .then(async () => {
          await tenantStatusQuery.refetch();
          await utils.invalidate();
        })
        .catch(() => {
          isCreatingTenantRef.current = false;
        });
    }
  }, [tenantStatusQuery.data, createTenantMut, tenantStatusQuery, utils]);

  const [step, setStep] = useState(1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Re-run mode & auto-trigger when setup was already completed (not cancelled) - locked on mount to prevent submission flicker
  const isRerunParam = searchParams?.get("mode") === "rerun";
  const setupAlreadyCompleted = userPrefQuery.data?.setupStatus === "COMPLETED";
  const [isRerun, setIsRerun] = useState<boolean>(() => isRerunParam || setupAlreadyCompleted);
  const initialSetupCompletedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (initialSetupCompletedRef.current === null && userPrefQuery.data !== undefined) {
      initialSetupCompletedRef.current = userPrefQuery.data?.setupStatus === "COMPLETED";
      if (initialSetupCompletedRef.current && !isRerunParam) {
        setIsRerun(true);
      }
    }
  }, [userPrefQuery.data, isRerunParam]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDiscardModal(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lifestyle = useSetupLifestyleState();
  const { setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal } = lifestyle;

  const accounts = useSetupBankAccountsState();
  const { bankAccounts, setBankAccounts, archivedAccountIds } = accounts;

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [billTypeOverrides, setBillTypeOverrides] = useState<Record<string, "RECURRING" | "TARGET_BALANCE">>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">>({});

  const incomeState = useSetupIncomeState({
    onProceedToNextStep: () => setStep(2),
  });

  const goalsState = useSetupGoalsState({
    onProceedToNextStep: () => setStep(isRerun ? 3 : 4),
  });

  const { incomes, setIncomes } = incomeState;
  const { goals, setGoals } = goalsState;

  // Prepopulation query
  const prepopulation = useSetupWizardPrepopulation({
    isRerun,
    enabled: !!session?.user && hasTenant,
    setIncomes,
    setBankAccounts,
    setGoals,
    setCustomCategories,
    setCategoryFrequencies,
  });

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
      setIncomes((prev) =>
        prev.map((inc) => (inc.id === "inc-1" && inc.amount === 3200 ? { ...inc, amount: 0 } : inc))
      );
      setBankAccounts((prev) =>
        prev.map((acc) => (acc.id === "acc-default" && acc.lastKnownBalance === "1000.00" ? { ...acc, lastKnownBalance: "0.00" } : acc))
      );
      setGoals((prev) =>
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
  }, [tenantQuery.data?.country, tenantQuery.data?.currency, isRerun, setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal, setBankAccounts, setIncomes, setGoals]);

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
      hasMedicalOutofPocket: lifestyle.hasMedicalOutofPocket,
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
    removedCategoryNames,
    archivedGoalIds: goalsState.archivedGoalIds,
    archivedAccountIds,
    archivedIncomeIds: incomeState.archivedIncomeIds,
    existingPools: prepopulation.pools,
  });

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      if (!isRerun) {
        if (!tenantStatusQuery.data?.hasTenant) {
          await createTenantMut.mutateAsync({
            name: "My Household",
            country: "AU",
            currency: "AUD",
            timezone: "Australia/Sydney",
          });
        }
        await cancelSetupMut.mutateAsync();
      }
      utils.getTenantStatus.setData(undefined, (old) =>
        old ? { ...old, setupCompleted: true, setupStatus: isRerun ? old.setupStatus : "CANCELLED" } : undefined
      );
      void utils.getTenantStatus.refetch();
      void utils.invalidate();
    } catch (_e) {
      // Non-blocking fallback
    } finally {
      setIsDiscarding(false);
      setShowDiscardModal(false);
    }
    router.replace("/dashboard");
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/setup")) {
        window.location.assign("/dashboard");
      }
    }, 150);
  };

  return {
    router,
    isRerun,
    isLoading: prepopulation.isLoading,
    step,
    setStep,
    isSubmitting: submission.isSubmitting,
    isDiscarding,
    showDiscardModal,
    setShowDiscardModal,
    goals,
    setGoals: goalsState.setGoals,
    handleUpdateGoal: goalsState.handleUpdateGoalField,
    handleRemoveGoal: goalsState.handleRemoveGoal,
    handleNextFromGoals: goalsState.handleNextFromGoals,
    availablePools: prepopulation.pools,
    incomes,
    setIncomes: incomeState.setIncomes,
    dirtyIncomeIds: incomeState.dirtyIncomeIds,
    handleUpdateIncome: incomeState.handleUpdateIncomeField,
    handleRemoveIncome: incomeState.handleRemoveIncome,
    handleNextFromIncomes: incomeState.handleNextFromIncomes,
    bankAccounts,
    setBankAccounts,
    handleAddAccount: accounts.handleAddAccount,
    handleUpdateAccount: accounts.handleUpdateAccount,
    handleRemoveAccount: accounts.handleRemoveAccount,
    customCategories,
    setCustomCategories,
    removedCategoryNames,
    setRemovedCategoryNames,
    amountOverrides,
    setAmountOverrides,
    billTypeOverrides,
    setBillTypeOverrides,
    categoryFrequencies,
    setCategoryFrequencies,
    showIcons: userPrefQuery.data?.showIcons ?? true,
    ...lifestyle,
    ...calculations,
    isAud,
    handleFinish: submission.handleFinish,
    handleDiscard,
  };
}
