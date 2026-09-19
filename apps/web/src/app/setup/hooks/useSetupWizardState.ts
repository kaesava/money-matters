"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import {
  QuizAnswers,
  calculateQuizEstimates,
  HousingType,
  EstimatedCategoryItem,
  IncomeItem,
  VehicleConfig,
  ChildConfig,
} from "@money-matters/types";
import { UserGoalItem } from "../components/SetupGoalsStep";

export function useSetupWizardState() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDiscardModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [goals, setGoals] = useState<UserGoalItem[]>([
    {
      id: "g-1",
      name: "Emergency Reserve (3-6 Months)",
      monthlyAmount: 300,
      icon: "🛡️",
      targetAmount: 10000,
      dueDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    },
    {
      id: "g-2",
      name: "Annual Family Holiday",
      monthlyAmount: 250,
      icon: "✈️",
      targetAmount: 5000,
      dueDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    },
  ]);

  const [weeklyGroceries, setWeeklyGroceries] = useState(270);
  const [weeklyDining, setWeeklyDining] = useState(240);
  const [weeklyPersonal, setWeeklyPersonal] = useState(100);

  const [incomes, setIncomes] = useState<IncomeItem[]>([
    { id: "inc-1", name: "Primary Income", amount: 3200, frequency: "FORTNIGHTLY", type: "SALARY" },
  ]);

  const [housingType, setHousingType] = useState<HousingType>("RENT_SOLO");
  const [hasCars, setHasCars] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleConfig[]>([
    { id: "veh-1", name: "Vehicle 1", size: "MID_SUV" },
  ]);
  const [usePublicTransport, setUsePublicTransport] = useState(true);
  const [useRideshare, setUseRideshare] = useState(false);

  const [hasKids, setHasKids] = useState(false);
  const [children, setChildren] = useState<ChildConfig[]>([
    { id: "child-1", name: "Child 1", stage: "PRIMARY", type: "PUBLIC" },
  ]);

  const [hasPrivateHealth, setHasPrivateHealth] = useState(true);
  const [hasGym, setHasGym] = useState(false);
  const [hasMedicalOutofPocket, setHasMedicalOutofPocket] = useState(false);

  const [hasDebt, setHasDebt] = useState(false);
  const [debtMonthlyRepayment, setDebtMonthlyRepayment] = useState(0);

  const [hasPets, setHasPets] = useState(false);
  const [petsCount, setPetsCount] = useState(1);

  const [hasCharityGiving, setHasCharityGiving] = useState(false);
  const [charityMonthlyAmount, setCharityMonthlyAmount] = useState(0);

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatType, setCustomCatType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [customCatAmount, setCustomCatAmount] = useState("100");

  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<
    Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">
  >({});

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const updatePrefMut = trpc.updateUserPreferences.useMutation();

  const [sweepQueue, setSweepQueue] = useState<Array<{ poolId: string; sweepDestinationPoolId?: string | null }>>([]);
  const [activeSweepPool, setActiveSweepPool] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [selectedSweepDest, setSelectedSweepDest] = useState<string>("");

  const showIcons = userPrefQuery.data?.showIcons ?? true;
  const searchParams = useSearchParams();
  const isRerun = searchParams?.get("mode") === "rerun";

  useEffect(() => {
    if (isRerun) return;
    if (userPrefQuery.data?.setupCompleted) {
      router.replace("/dashboard");
    }
  }, [isRerun, userPrefQuery.data?.setupCompleted, router]);

  // Pre-populate if in rerun mode
  useEffect(() => {
    if (!isRerun) return;
    if (incomeSourcesQuery.data && incomeSourcesQuery.data.length > 0) {
      setIncomes(
        incomeSourcesQuery.data.map((inc) => {
          let freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "CUSTOM" = "FORTNIGHTLY";
          if (inc.rrule?.includes("INTERVAL=2")) freq = "FORTNIGHTLY";
          else if (inc.rrule?.includes("WEEKLY")) freq = "WEEKLY";
          else if (inc.rrule?.includes("MONTHLY")) freq = "MONTHLY";
          return {
            id: inc.id,
            name: inc.name,
            amount: parseFloat(inc.amount || "0"),
            frequency: freq,
            type: "SALARY",
            receivingAccountId: inc.receivingAccountId,
          };
        })
      );
    }
  }, [isRerun, incomeSourcesQuery.data]);

  useEffect(() => {
    if (!isRerun) return;
    if (poolsQuery.data && poolsQuery.data.length > 0) {
      const goalPools = poolsQuery.data.filter((p) => p.poolType === "GOAL");
      if (goalPools.length > 0) {
        setGoals(
          goalPools.map((g) => ({
            id: g.id,
            name: g.name,
            monthlyAmount: Math.round(parseFloat(g.targetAmount || "1000") / 12),
            icon: "🎯",
            targetAmount: parseFloat(g.targetAmount || "1000"),
            dueDate: g.targetDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
          }))
        );
      }
    }
  }, [isRerun, poolsQuery.data]);

  useEffect(() => {
    if (!isRerun) return;
    if (categoriesQuery.data && categoriesQuery.data.length > 0) {
      setCustomCategories(
        categoriesQuery.data.map((c) => ({
          id: c.id,
          name: c.name,
          type: (c.poolType === "EVERYDAY" || c.poolType === "GOAL" ? c.poolType : "REGULAR") as "REGULAR" | "GOAL" | "EVERYDAY",
          monthlyAud: parseFloat(c.monthlyAmount || "0"),
          icon: c.icon || "📌",
        }))
      );
    }
  }, [isRerun, categoriesQuery.data]);

  const handleRemoveGoal = (id: string) => {
    const existingPool = poolsQuery.data?.find((p) => p.id === id);
    const balance = existingPool?.currentBalance || 0;
    if (balance > 0.005) {
      setActiveSweepPool({ id, name: existingPool?.name || "Goal", balance });
      const availableDests = (poolsQuery.data || []).filter((p) => p.id !== id);
      const defaultDest = availableDests.find((p) => p.isSurplusTarget)?.id || availableDests[0]?.id || "";
      setSelectedSweepDest(defaultDest);
    } else {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      if (!id.startsWith("g-")) {
        setSweepQueue((prev) => [...prev, { poolId: id }]);
      }
    }
  };

  const confirmSweepAndRemove = () => {
    if (!activeSweepPool) return;
    setSweepQueue((prev) => [
      ...prev,
      { poolId: activeSweepPool.id, sweepDestinationPoolId: selectedSweepDest },
    ]);
    setGoals((prev) => prev.filter((g) => g.id !== activeSweepPool.id));
    setActiveSweepPool(null);
  };

  const quizAnswers: QuizAnswers = useMemo(
    () => ({
      incomes,
      housingType,
      hasCars,
      vehicles,
      usePublicTransport,
      useRideshare,
      hasKids,
      children,
      hasPrivateHealth,
      hasMedicalOutofPocket,
      hasGym,
      hasPets,
      petsCount,
      activeDebtMonthlyRepayment: debtMonthlyRepayment,
      givesCharity: hasCharityGiving,
      familySupportMonthlyAmount: charityMonthlyAmount,
      weeklyGroceries,
      weeklyDining,
      weeklyPersonal,
    }),
    [
      incomes,
      housingType,
      hasCars,
      vehicles,
      usePublicTransport,
      useRideshare,
      hasKids,
      children,
      hasPrivateHealth,
      hasMedicalOutofPocket,
      hasGym,
      hasPets,
      petsCount,
      debtMonthlyRepayment,
      hasCharityGiving,
      charityMonthlyAmount,
      weeklyGroceries,
      weeklyDining,
      weeklyPersonal,
    ]
  );

  const estimation = useMemo(() => calculateQuizEstimates(quizAnswers), [quizAnswers]);

  const activeCategories = useMemo(() => {
    const combined = [
      ...estimation.regularBills,
      ...estimation.goalSinkingFunds,
      ...estimation.everydayCategories,
      ...customCategories,
    ];

    return combined
      .filter((cat) => !removedCategoryNames.has(cat.name))
      .map((cat) => {
        const override = amountOverrides[cat.name];
        return {
          ...cat,
          monthlyAud: override !== undefined ? override : cat.monthlyAud,
        };
      });
  }, [
    estimation.regularBills,
    estimation.goalSinkingFunds,
    estimation.everydayCategories,
    customCategories,
    removedCategoryNames,
    amountOverrides,
  ]);

  const activeEveryday = useMemo(() => activeCategories.filter((c) => c.type === "EVERYDAY"), [activeCategories]);
  const activeRegular = useMemo(() => activeCategories.filter((c) => c.type === "REGULAR"), [activeCategories]);
  const activeGoals = useMemo(() => activeCategories.filter((c) => c.type === "GOAL"), [activeCategories]);

  const totalEverydayMonthly = useMemo(() => activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0), [activeEveryday]);
  const totalRegularMonthly = useMemo(() => activeRegular.reduce((acc, c) => acc + c.monthlyAud, 0), [activeRegular]);
  const totalGoalMonthly = useMemo(() => activeGoals.reduce((acc, c) => acc + c.monthlyAud, 0), [activeGoals]);

  const totalAllocatedMonthly = useMemo(
    () => totalEverydayMonthly + totalRegularMonthly + totalGoalMonthly,
    [totalEverydayMonthly, totalRegularMonthly, totalGoalMonthly]
  );

  const convertToMonthly = (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY"): number => {
    if (freq === "WEEKLY") return Math.round(amount * (52 / 12));
    if (freq === "FORTNIGHTLY") return Math.round(amount * (26 / 12));
    if (freq === "YEARLY") return Math.round(amount / 12);
    return Math.round(amount);
  };

  const convertFromMonthly = (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY"): number => {
    if (freq === "WEEKLY") return Math.round(monthlyAmount / (52 / 12));
    if (freq === "FORTNIGHTLY") return Math.round(monthlyAmount / (26 / 12));
    if (freq === "YEARLY") return Math.round(monthlyAmount * 12);
    return Math.round(monthlyAmount);
  };

  const saveSetupBudgetMut = trpc.saveSetupBudget.useMutation();

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const existingPools = poolsQuery.data || [];
      const existingEveryday = existingPools.find((p) => p.poolType === "EVERYDAY");
      const existingRegular = existingPools.find((p) => p.poolType === "REGULAR");

      const accountsPayload = (bankAccountsQuery.data || []).map((acc) => ({
        id: acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || "CBA",
        lastKnownBalance: String(acc.lastKnownBalance || "0.00"),
        unbudgetedBuffer: String(acc.unbudgetedBuffer || "0.00"),
        isPrivate: Boolean(acc.isPrivate),
      }));

      const poolsPayload = [
        {
          id: existingEveryday?.id,
          name: existingEveryday?.name || "Everyday Spending",
          poolType: "EVERYDAY" as const,
          everydayAllowanceAmount: (totalEverydayMonthly || 1000).toFixed(2),
          isSurplusTarget: false,
          isCommitted: false,
          isPrivate: false,
        },
        {
          id: existingRegular?.id,
          name: existingRegular?.name || "Regular Bills",
          poolType: "REGULAR" as const,
          isSurplusTarget: false,
          isCommitted: false,
          isPrivate: false,
        },
        ...goals.map((g, idx) => ({
          id: g.id?.startsWith("g-") ? undefined : g.id,
          name: g.name,
          poolType: "GOAL" as const,
          targetAmount: (g.targetAmount || g.monthlyAmount * 12 || 1000).toFixed(2),
          targetDate: g.dueDate || null,
          isSurplusTarget: idx === 0,
          isCommitted: true,
          isPrivate: false,
        })),
      ];

      const categoriesPayload = activeCategories.map((c) => {
        const rawFreq = categoryFrequencies[c.name];
        const budgetFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" =
          rawFreq === "YEARLY" ? "ANNUALLY" : "MONTHLY";
        const catId = "id" in c && typeof c.id === "string" && !c.id.startsWith("temp-") ? c.id : undefined;
        return {
          id: catId,
          name: c.name,
          poolType: c.type,
          monthlyAmount: (c.monthlyAud || 0).toFixed(2),
          enteredAmount: (c.monthlyAud || 0).toFixed(2),
          budgetFrequency: budgetFreq,
          icon: c.icon || "wallet",
          isEssential: c.type === "REGULAR",
        };
      });

      const incomesPayload = incomes.map((inc) => {
        const incType: "SALARY" | "FREELANCE" | "INVESTMENT" | "OTHER" =
          inc.type === "BUSINESS" ? "FREELANCE" : inc.type === "SALARY" || inc.type === "OTHER" ? inc.type : "SALARY";
        const incFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "CUSTOM" =
          inc.frequency === "WEEKLY" || inc.frequency === "FORTNIGHTLY" || inc.frequency === "MONTHLY" ? inc.frequency : "CUSTOM";
        return {
          id: inc.id?.startsWith("inc-") ? undefined : inc.id,
          name: inc.name,
          type: incType,
          amount: (inc.amount || 0).toFixed(2),
          frequency: incFreq,
          receivingAccountId: inc.receivingAccountId || null,
        };
      });

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: "Primary Account", bankProvider: "CBA", lastKnownBalance: "1000.00", unbudgetedBuffer: "0.00", isPrivate: false }
        ],
        pools: poolsPayload,
        categories: categoriesPayload,
        archivedPools: sweepQueue,
        archivedCategoryIds: Array.from(removedCategoryNames).filter((name) => !name.startsWith("temp-")),
        archetypeApplied: accountsPayload.length >= 2 ? "AUSSIE_2_ACCOUNT" : "ALL_IN_ONE_CUSTOM",
      });

      posthog.capture("setup_completed", {
        isRerun,
        income_count: incomes.length,
        category_count: activeCategories.length,
        goal_count: goals.length,
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Failed to complete setup:", err);
      alert(`Setup Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
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
    isSubmitting,
    showDiscardModal,
    setShowDiscardModal,
    goals,
    setGoals,
    handleRemoveGoal,
    activeSweepPool,
    setActiveSweepPool,
    selectedSweepDest,
    setSelectedSweepDest,
    confirmSweepAndRemove,
    availablePools: poolsQuery.data || [],
    weeklyGroceries,
    setWeeklyGroceries,
    weeklyDining,
    setWeeklyDining,
    weeklyPersonal,
    setWeeklyPersonal,
    incomes,
    setIncomes,
    housingType,
    setHousingType,
    hasCars,
    setHasCars,
    vehicles,
    setVehicles,
    usePublicTransport,
    setUsePublicTransport,
    useRideshare,
    setUseRideshare,
    hasKids,
    setHasKids,
    children,
    setChildren,
    hasPrivateHealth,
    setHasPrivateHealth,
    hasGym,
    setHasGym,
    hasMedicalOutofPocket,
    setHasMedicalOutofPocket,
    hasDebt,
    setHasDebt,
    debtMonthlyRepayment,
    setDebtMonthlyRepayment,
    hasPets,
    setHasPets,
    petsCount,
    setPetsCount,
    hasCharityGiving,
    setHasCharityGiving,
    charityMonthlyAmount,
    setCharityMonthlyAmount,
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
    showIcons,
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
    handleFinish,
    handleDiscard,
  };
}
