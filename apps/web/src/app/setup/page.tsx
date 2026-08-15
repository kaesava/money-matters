"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import {
  QuizAnswers,
  calculateQuizEstimates,
  HousingType,
  EstimatedCategoryItem,
  IncomeItem,
  VehicleConfig,
  ChildConfig,
} from "@money-matters/types";
import { SetupIncomeStep } from "./components/SetupIncomeStep";
import { SetupGoalsStep, UserGoalItem } from "./components/SetupGoalsStep";
import { SetupLifestyleStep } from "./components/SetupLifestyleStep";
import { SetupCategoriesStep } from "./components/SetupCategoriesStep";
import { SetupWaterfallStep } from "./components/SetupWaterfallStep";
import { SetupDiscardModal } from "./components/SetupDiscardModal";
import { SetupReconcileModal } from "./components/SetupReconcileModal";

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRerun = searchParams.get("mode") === "rerun";

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Step 2: User Savings & Future Goals
  const [goals, setGoals] = useState<UserGoalItem[]>([
    { id: "g-1", name: "Emergency Reserve (3-6 Months)", monthlyAmount: 300, icon: "🛡️", targetAmount: 10000 },
    { id: "g-2", name: "Annual Family Holiday", monthlyAmount: 250, icon: "✈️", targetAmount: 5000 },
  ]);

  // Step 2: Interactive Lifestyle Sliders
  const [weeklyGroceries, setWeeklyGroceries] = useState(270);
  const [weeklyDining, setWeeklyDining] = useState(240);
  const [weeklyPersonal, setWeeklyPersonal] = useState(100);

  // Step 1: Dynamic Income Sources List
  const [incomes, setIncomes] = useState<IncomeItem[]>([
    { id: "inc-1", name: "Primary Income", amount: 3200, frequency: "FORTNIGHTLY", type: "SALARY" },
  ]);

  // Step 2: Life-Builder Questionnaire
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

  // Custom added categories & tracking
  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatType, setCustomCatType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [customCatAmount, setCustomCatAmount] = useState("100");

  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<
    Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">
  >({});

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

  const existingCategoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isRerun });
  const existingCategories = useMemo(() => existingCategoriesQuery.data ?? [], [existingCategoriesQuery.data]);

  const currentBillsCap = useMemo(() => {
    return existingCategories
      .filter((c) => c.type === "REGULAR")
      .reduce((sum, c) => sum + parseFloat(c.monthlyAmount || "0"), 0);
  }, [existingCategories]);

  const currentEverydayCap = useMemo(() => {
    return existingCategories
      .filter((c) => c.type === "EVERYDAY")
      .reduce((sum, c) => sum + parseFloat(c.monthlyAmount || "0"), 0);
  }, [existingCategories]);

  const mapWithExistingId = (item: EstimatedCategoryItem, type: "REGULAR" | "GOAL" | "EVERYDAY") => {
    const matched = existingCategories.find(
      (ec) => ec.name.trim().toLowerCase() === item.name.trim().toLowerCase() && ec.type === type
    );
    return {
      id: matched?.id,
      name: item.name,
      type,
      monthlyAmount: item.monthlyAud,
      targetAmount: item.monthlyAud,
    };
  };

  const createIncomeSource = trpc.createIncomeSource.useMutation();
  const createCategory = trpc.createCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const generateEvents = trpc.generateNextIncomeEvents.useMutation();
  const reSetupBudget = trpc.reSetupBudget.useMutation();

  const quizAnswers: QuizAnswers = useMemo(() => {
    return {
      incomes,
      housingType,
      hasCars,
      vehicles: hasCars ? vehicles : [],
      usePublicTransport,
      useRideshare,
      hasKids,
      children: hasKids ? children : [],
      hasPrivateHealth,
      hasGym,
      hasPets: false,
      petsCount: 0,
      activeDebtMonthlyRepayment: 0,
      givesCharity: false,
      familySupportMonthlyAmount: 0,
      weeklyGroceries,
      weeklyDining,
      weeklyPersonal,
    };
  }, [
    incomes,
    housingType,
    hasCars,
    vehicles,
    usePublicTransport,
    useRideshare,
    hasKids,
    children,
    hasPrivateHealth,
    hasGym,
    weeklyGroceries,
    weeklyDining,
    weeklyPersonal,
  ]);

  const estimation = useMemo(() => calculateQuizEstimates(quizAnswers), [quizAnswers]);

  const activeRegular = useMemo(() => {
    const calculated = estimation.regularBills
      .filter((item) => !removedCategoryNames.has(item.name))
      .map((item) => ({
        ...item,
        monthlyAud: amountOverrides[item.name] ?? item.monthlyAud,
      }));
    const custom = customCategories.filter((c) => c.type === "REGULAR" && !removedCategoryNames.has(c.name));
    return [...calculated, ...custom];
  }, [estimation.regularBills, amountOverrides, customCategories, removedCategoryNames]);

  const activeGoals = useMemo(() => {
    const calculated = estimation.goalSinkingFunds
      .filter((item) => !removedCategoryNames.has(item.name))
      .map((item) => ({
        ...item,
        monthlyAud: amountOverrides[item.name] ?? item.monthlyAud,
      }));
    const userGoalsFormatted: EstimatedCategoryItem[] = goals.map((g) => ({
      name: g.name,
      type: "GOAL" as const,
      monthlyAud: g.monthlyAmount,
      icon: g.icon || "🎯",
      colour: "#00B4A6",
    }));
    const custom = customCategories.filter((c) => c.type === "GOAL" && !removedCategoryNames.has(c.name));
    
    // Deduplicate goals by name
    const combined = [...calculated, ...userGoalsFormatted, ...custom];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (removedCategoryNames.has(item.name)) return false;
      const lower = item.name.trim().toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [estimation.goalSinkingFunds, amountOverrides, goals, customCategories, removedCategoryNames]);

  const activeEveryday = useMemo(() => {
    const calculated = estimation.everydayCategories
      .filter((item) => !removedCategoryNames.has(item.name))
      .map((item) => ({
        ...item,
        monthlyAud: amountOverrides[item.name] ?? item.monthlyAud,
      }));
    const custom = customCategories.filter((c) => c.type === "EVERYDAY" && !removedCategoryNames.has(c.name));
    return [...calculated, ...custom];
  }, [estimation.everydayCategories, amountOverrides, customCategories, removedCategoryNames]);

  const totalRegularMonthly = useMemo(() => activeRegular.reduce((acc, c) => acc + c.monthlyAud, 0), [activeRegular]);
  const totalGoalMonthly = useMemo(() => activeGoals.reduce((acc, c) => acc + c.monthlyAud, 0), [activeGoals]);
  const totalEverydayMonthly = useMemo(
    () => activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0),
    [activeEveryday]
  );
  const totalAllocatedMonthly = totalRegularMonthly + totalGoalMonthly + totalEverydayMonthly;

  const handleFinish = async () => {
    if (isRerun) {
      setShowReconcileModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      for (const inc of incomes) {
        await createIncomeSource.mutateAsync({
          name: inc.name.trim() || "Primary Income",
          amount: inc.amount.toFixed(2),
          isRecurring: true,
          startDate: new Date().toISOString().split("T")[0]!,
          frequency: inc.frequency,
        });
      }

      const allCategoriesToCreate = [...activeRegular, ...activeGoals, ...activeEveryday];
      const createdCategories = await Promise.all(
        allCategoriesToCreate.map(async (cat) => {
          const created = await createCategory.mutateAsync({
            name: cat.name,
            type: cat.type,
            budgetFrequency: "MONTHLY",
            enteredAmount: cat.monthlyAud.toString(),
            monthlyAmount: cat.monthlyAud.toString(),
          });
          return { createdId: created.id, amount: cat.monthlyAud };
        })
      );

      await Promise.all(
        createdCategories.map(({ createdId, amount }) => {
          if (amount > 0) {
            return createCategorySchedule.mutateAsync({
              categoryId: createdId,
              targetAmount: amount.toFixed(2),
            });
          }
          return Promise.resolve();
        })
      );

      await generateEvents.mutateAsync();
      posthog.capture("interactive_setup_completed", {
        total_categories: allCategoriesToCreate.length,
        total_income: estimation.totalMonthlyIncomeAud,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to complete setup:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReconcile = async () => {
    setIsSubmitting(true);
    try {
      const categoriesList = [
        ...activeRegular.map((c) => mapWithExistingId(c, "REGULAR")),
        ...activeGoals.map((c) => mapWithExistingId(c, "GOAL")),
        ...activeEveryday.map((c) => mapWithExistingId(c, "EVERYDAY")),
      ];

      await reSetupBudget.mutateAsync({
        everydayTargetCap: totalEverydayMonthly,
        billsTargetCap: totalRegularMonthly,
        categoriesList,
      });

      posthog.capture("budget_resetup_completed", {
        total_categories: categoriesList.length,
        total_income: estimation.totalMonthlyIncomeAud,
      });

      setShowReconcileModal(false);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to complete budget re-setup:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-zinc-200/80 p-6 sm:p-8 flex flex-col gap-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h1 className="text-lg font-black text-[#1B2B4B]">
              {isRerun ? "Re-run Budget Setup" : "Interactive Budget Setup"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDiscardModal(true)}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <span className="text-xs font-black text-[#00B4A6] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Step {step} of 5
            </span>
          </div>
        </div>

        {step === 1 && (
          <SetupIncomeStep
            incomes={incomes}
            onAddIncome={() => {
              const id = `inc-${Date.now()}`;
              setIncomes((prev) => [
                ...prev,
                { id, name: `Income Source ${prev.length + 1}`, amount: 1500, frequency: "FORTNIGHTLY", type: "SALARY" },
              ]);
            }}
            onUpdateIncome={(id, field, value) => {
              setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: value } : inc)));
            }}
            onRemoveIncome={(id) => {
              if (incomes.length > 1) setIncomes((prev) => prev.filter((inc) => inc.id !== id));
            }}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <SetupGoalsStep
            goals={goals}
            onAddGoal={(g) => {
              const id = `g-${Date.now()}`;
              setGoals((prev) => [...prev, { ...g, id }]);
            }}
            onUpdateGoal={(id, field, value) => {
              setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
            }}
            onRemoveGoal={(id) => setGoals((prev) => prev.filter((g) => g.id !== id))}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <SetupLifestyleStep
            housingType={housingType}
            setHousingType={setHousingType}
            hasCars={hasCars}
            setHasCars={setHasCars}
            vehicles={vehicles}
            onAddVehicle={() => {
              const id = `veh-${Date.now()}`;
              setVehicles((prev) => [...prev, { id, name: `Vehicle ${prev.length + 1}`, size: "MID_SUV" }]);
            }}
            onUpdateVehicle={(id, field, value) => {
              setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
            }}
            onRemoveVehicle={(id) => setVehicles((prev) => prev.filter((v) => v.id !== id))}
            usePublicTransport={usePublicTransport}
            setUsePublicTransport={setUsePublicTransport}
            useRideshare={useRideshare}
            setUseRideshare={setUseRideshare}
            hasKids={hasKids}
            setHasKids={setHasKids}
            childrenList={children}
            onAddChild={() => {
              const id = `child-${Date.now()}`;
              setChildren((prev) => [...prev, { id, name: `Child ${prev.length + 1}`, stage: "PRIMARY", type: "PUBLIC" }]);
            }}
            onUpdateChild={(id, field, value) => {
              setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
            }}
            onRemoveChild={(id) => setChildren((prev) => prev.filter((c) => c.id !== id))}
            hasPrivateHealth={hasPrivateHealth}
            setHasPrivateHealth={setHasPrivateHealth}
            hasGym={hasGym}
            setHasGym={setHasGym}
            weeklyGroceries={weeklyGroceries}
            setWeeklyGroceries={setWeeklyGroceries}
            weeklyDining={weeklyDining}
            setWeeklyDining={setWeeklyDining}
            weeklyPersonal={weeklyPersonal}
            setWeeklyPersonal={setWeeklyPersonal}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <SetupCategoriesStep
            activeEveryday={activeEveryday}
            activeRegular={activeRegular}
            activeGoals={activeGoals}
            categoryFrequencies={categoryFrequencies}
            setCategoryFrequencies={setCategoryFrequencies}
            setAmountOverrides={setAmountOverrides}
            onRemoveCategory={(name) => setRemovedCategoryNames((prev) => new Set(prev).add(name))}
            customCatName={customCatName}
            setCustomCatName={setCustomCatName}
            customCatType={customCatType}
            setCustomCatType={setCustomCatType}
            customCatAmount={customCatAmount}
            setCustomCatAmount={setCustomCatAmount}
            onAddCustomCategory={() => {
              if (!customCatName.trim()) return;
              const amount = parseFloat(customCatAmount) || 0;
              setCustomCategories((prev) => [
                ...prev,
                {
                  name: customCatName.trim(),
                  type: customCatType,
                  monthlyAud: amount,
                  icon: customCatType === "REGULAR" ? "📌" : customCatType === "GOAL" ? "🎯" : "🛒",
                },
              ]);
              setCustomCatName("");
              setCustomCatAmount("100");
            }}
            convertToMonthly={convertToMonthly}
            convertFromMonthly={convertFromMonthly}
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <SetupWaterfallStep
            totalMonthlyIncomeAud={estimation.totalMonthlyIncomeAud}
            totalAllocatedMonthly={totalAllocatedMonthly}
            totalEverydayMonthly={totalEverydayMonthly}
            totalRegularMonthly={totalRegularMonthly}
            totalGoalMonthly={totalGoalMonthly}
            isRerun={isRerun}
            isSubmitting={isSubmitting}
            onBack={() => setStep(4)}
            onFinish={handleFinish}
          />
        )}

        <SetupReconcileModal
          isOpen={showReconcileModal}
          isSubmitting={isSubmitting}
          totalRegularMonthly={totalRegularMonthly}
          totalEverydayMonthly={totalEverydayMonthly}
          currentBillsCap={currentBillsCap}
          currentEverydayCap={currentEverydayCap}
          onClose={() => setShowReconcileModal(false)}
          onConfirm={handleConfirmReconcile}
        />

        <SetupDiscardModal
          isOpen={showDiscardModal}
          onClose={() => setShowDiscardModal(false)}
          onConfirm={() => {
            setShowDiscardModal(false);
            router.push("/dashboard");
          }}
        />
      </div>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">{t('common.loading')}</div>}>
      <SetupWizardContent />
    </React.Suspense>
  );
}
