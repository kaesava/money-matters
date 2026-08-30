"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const appPrefs = userPrefQuery.data?.appPreferences as Record<string, Record<string, boolean>> | undefined;
  const prefsBlob = appPrefs?.["01908bde-34bb-7b19-a178-574211bc93aa"];
  const showIcons = prefsBlob?.show_icons ?? true;

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

  const updatePrefMut = trpc.updateUserPreferences.useMutation();

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await updatePrefMut.mutateAsync({ setupCompleted: true });

      posthog.capture("onboarding_completed", {
        step: 4,
        income_count: incomes.length,
        category_count: activeCategories.length,
        goal_count: goals.length,
      });

      router.push("/dashboard");

    } catch (err: unknown) {
      console.error("Failed to complete onboarding:", err);
      alert(`Onboarding Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    setShowDiscardModal(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("skip_setup_wizard", "true");
    }
    try {
      await updatePrefMut.mutateAsync({ setupCompleted: true });
    } catch (_e) {
      // Ignore if preference update fails
    }
    router.replace("/dashboard");
  };

  return {
    router,
    step,
    setStep,
    isSubmitting,
    showDiscardModal,
    setShowDiscardModal,
    goals,
    setGoals,
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
