"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import {
  QuizAnswers,
  calculateQuizEstimates,
  HousingType,
  CarSize,
  SchoolType,
  SchoolStage,
  EstimatedCategoryItem,
  IncomeItem,
  VehicleConfig,
  ChildConfig,
} from "@money-matters/types";
import { Spinner } from "@money-matters/ui/web";

export default function SetupWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRerun = searchParams.get("mode") === "rerun";

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Step 1: Dynamic Income Sources List
  const [incomes, setIncomes] = useState<IncomeItem[]>([
    { id: "inc-1", name: "Primary Income", amount: 3200, frequency: "FORTNIGHTLY", type: "SALARY" },
  ]);

  // Step 2: Life-Builder Questionnaire
  const [housingType, setHousingType] = useState<HousingType>("RENT_SOLO");
  
  // Transport: Per-Vehicle Array
  const [hasCars, setHasCars] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleConfig[]>([
    { id: "veh-1", name: "Vehicle 1", size: "MID_SUV" },
  ]);
  const [usePublicTransport, setUsePublicTransport] = useState(true);
  const [useRideshare, setUseRideshare] = useState(false);

  // Family: Per-Child Array
  const [hasKids, setHasKids] = useState(false);
  const [children, setChildren] = useState<ChildConfig[]>([
    { id: "child-1", name: "Child 1", stage: "PRIMARY", type: "PUBLIC" },
  ]);

  const [hasPrivateHealth, setHasPrivateHealth] = useState(true);
  const [hasGym, setHasGym] = useState(false);

  const [hasPets, setHasPets] = useState(false);
  const [petsCount, setPetsCount] = useState(1);
  const [activeDebtMonthlyRepayment, setActiveDebtMonthlyRepayment] = useState(0);

  const [givesCharity, setGivesCharity] = useState(false);
  const [familySupportMonthlyAmount, setFamilySupportMonthlyAmount] = useState(0);

  // Sliders
  const [weeklyGroceries, setWeeklyGroceries] = useState(270);
  const [weeklyDining, setWeeklyDining] = useState(240);
  const [weeklyPersonal, setWeeklyPersonal] = useState(100);

  // Custom added categories & Deleted Categories tracking
  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatType, setCustomCatType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [customCatAmount, setCustomCatAmount] = useState("100");

  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>({});

  // Helper to convert any frequency input amount to monthly AUD
  const convertToMonthly = (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY"): number => {
    if (freq === "WEEKLY") return Math.round(amount * (52 / 12));
    if (freq === "FORTNIGHTLY") return Math.round(amount * (26 / 12));
    if (freq === "YEARLY") return Math.round(amount / 12);
    return Math.round(amount);
  };

  // Helper to display raw input amount in current selected frequency mode
  const convertFromMonthly = (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY"): number => {
    if (freq === "WEEKLY") return Math.round(monthlyAmount / (52 / 12));
    if (freq === "FORTNIGHTLY") return Math.round(monthlyAmount / (26 / 12));
    if (freq === "YEARLY") return Math.round(monthlyAmount * 12);
    return Math.round(monthlyAmount);
  };

  // Existing categories query for rerun matching
  const existingCategoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isRerun });
  const existingCategories = existingCategoriesQuery.data ?? [];

  // Current active caps for diff calculations
  const currentBillsCap = useMemo(() => {
    return existingCategories
      .filter((c) => c.type === "REGULAR")
      .reduce((sum, c) => sum + (parseFloat(c.monthlyAmount || "0")), 0);
  }, [existingCategories]);

  const currentEverydayCap = useMemo(() => {
    return existingCategories
      .filter((c) => c.type === "EVERYDAY")
      .reduce((sum, c) => sum + (parseFloat(c.monthlyAmount || "0")), 0);
  }, [existingCategories]);

  // Reconciliation modal state
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Helper to attach existing category ID if matched by name and type
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

  // Mutations
  const createIncomeSource = trpc.createIncomeSource.useMutation();
  const createCategory = trpc.createCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const generateEvents = trpc.generateNextIncomeEvents.useMutation();
  const reSetupBudget = trpc.reSetupBudget.useMutation();

  // Active Tooltip Info Popup State
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Compute quiz estimates dynamically
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
      hasPets,
      petsCount: hasPets ? petsCount : 0,
      activeDebtMonthlyRepayment,
      givesCharity,
      familySupportMonthlyAmount,
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
    hasPets,
    petsCount,
    activeDebtMonthlyRepayment,
    givesCharity,
    familySupportMonthlyAmount,
    weeklyGroceries,
    weeklyDining,
    weeklyPersonal,
  ]);

  const estimation = useMemo(() => {
    return calculateQuizEstimates(quizAnswers);
  }, [quizAnswers]);

  // Combine calculated + custom categories minus removed categories
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
    const custom = customCategories.filter((c) => c.type === "GOAL" && !removedCategoryNames.has(c.name));
    return [...calculated, ...custom];
  }, [estimation.goalSinkingFunds, amountOverrides, customCategories, removedCategoryNames]);

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
  const totalEverydayMonthly = useMemo(() => activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0), [activeEveryday]);
  const totalAllocatedMonthly = totalRegularMonthly + totalGoalMonthly + totalEverydayMonthly;

  // Step 1: Dynamic Income Handlers
  const handleAddIncome = () => {
    const id = `inc-${Date.now()}`;
    setIncomes((prev) => [
      ...prev,
      { id, name: `Income Source ${prev.length + 1}`, amount: 1500, frequency: "FORTNIGHTLY", type: "SALARY" },
    ]);
  };

  const handleUpdateIncome = (id: string, field: keyof IncomeItem, value: any) => {
    setIncomes((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, [field]: value } : inc))
    );
  };

  const handleRemoveIncome = (id: string) => {
    if (incomes.length <= 1) return;
    setIncomes((prev) => prev.filter((inc) => inc.id !== id));
  };

  // Step 2: Vehicle Handlers
  const handleAddVehicle = () => {
    const id = `veh-${Date.now()}`;
    setVehicles((prev) => [...prev, { id, name: `Vehicle ${prev.length + 1}`, size: "MID_SUV" }]);
  };

  const handleUpdateVehicle = (id: string, field: keyof VehicleConfig, value: any) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleRemoveVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  // Step 2: Child Handlers
  const handleAddChild = () => {
    const id = `child-${Date.now()}`;
    setChildren((prev) => [
      ...prev,
      { id, name: `Child ${prev.length + 1}`, stage: "PRIMARY", type: "PUBLIC" },
    ]);
  };

  const handleUpdateChild = (id: string, field: keyof ChildConfig, value: any) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleRemoveChild = (id: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  // Category Handlers
  const handleRemoveCategory = (name: string) => {
    setRemovedCategoryNames((prev) => new Set(prev).add(name));
  };

  const handleAddCustomCategory = () => {
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
  };

  const handleCancelClick = () => {
    setShowDiscardModal(true);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    router.push("/dashboard");
  };

  const handleFinish = async () => {
    if (isRerun) {
      setShowReconcileModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Initial setup flow
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
              onClick={handleCancelClick}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <span className="text-xs font-black text-[#00B4A6] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Step {step} of 4
            </span>
          </div>
        </div>

        {/* Step 1: Income Engine */}
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[#1B2B4B]">💰 Income & Earnings</h2>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === "inc" ? null : "inc")}
                  className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                >
                  ℹ️
                </button>
              </div>
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                Enter your regular pay or earnings (take-home after tax). You can add as many income sources as needed.
              </p>
              {activeTooltip === "inc" && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                  We use your take-home pay to calculate your monthly cashflow and build your automated 5-step waterfall budget allocations accurately.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
              {incomes.map((inc, index) => (
                <div key={inc.id} className="p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B2B4B]">Income Source #{index + 1}</span>
                    {incomes.length > 1 && (
                      <button
                        onClick={() => handleRemoveIncome(inc.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-zinc-500">Label / Name</label>
                      <input
                        type="text"
                        value={inc.name}
                        onChange={(e) => handleUpdateIncome(inc.id, "name", e.target.value)}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                        placeholder="e.g. Salary, Consulting"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-zinc-500">Take-Home Amount ($)</label>
                      <input
                        type="number"
                        value={inc.amount}
                        onChange={(e) => handleUpdateIncome(inc.id, "amount", parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-zinc-500">Frequency</label>
                      <select
                        value={inc.frequency}
                        onChange={(e) => handleUpdateIncome(inc.id, "frequency", e.target.value)}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="FORTNIGHTLY">Fortnightly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddIncome}
                className="py-2.5 px-4 bg-teal-50 border border-teal-200 text-[#00B4A6] text-xs font-bold rounded-xl hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
              >
                + Add Another Income Source
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
              >
                Continue to Lifestyle Questions →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Life-Builder Questionnaire */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[#1B2B4B]">🏡 Lifestyle Setup</h2>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === "life" ? null : "life")}
                  className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                >
                  ℹ️
                </button>
              </div>
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                Tell us a few details about your living setup so we can auto-estimate baseline bill costs.
              </p>
              {activeTooltip === "life" && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                  We use official 2025/2026 Australian Bureau of Statistics (ABS) & RACQ benchmark statistics to calculate initial bill estimates tailored specifically for your lifestyle.
                </div>
              )}
            </div>

            {/* Housing */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#1B2B4B]">Housing Setup</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "RENT_SOLO", label: "Rent (Solo)" },
                  { id: "RENT_SHARE", label: "Sharehouse" },
                  { id: "OWN_MORTGAGE", label: "Mortgage" },
                  { id: "OWN_OUTRIGHT", label: "Own Outright" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setHousingType(opt.id as HousingType)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      housingType === opt.id
                        ? "bg-[#2563eb] text-white border-[#2563eb]"
                        : "bg-white text-[#1B2B4B] border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transport: Per Vehicle Selection */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
              <span className="text-xs font-bold text-[#1B2B4B]">Transport & Vehicles</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCars}
                    onChange={(e) => {
                      setHasCars(e.target.checked);
                      if (e.target.checked && vehicles.length === 0) {
                        setVehicles([{ id: "veh-1", name: "Vehicle 1", size: "MID_SUV" }]);
                      }
                    }}
                    className="w-4 h-4 text-[#2563eb] rounded-md"
                  />
                  Own Vehicle(s)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePublicTransport}
                    onChange={(e) => setUsePublicTransport(e.target.checked)}
                    className="w-4 h-4 text-[#2563eb] rounded-md"
                  />
                  Public Transport
                </label>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRideshare}
                    onChange={(e) => setUseRideshare(e.target.checked)}
                    className="w-4 h-4 text-[#2563eb] rounded-md"
                  />
                  Rideshare / Taxi
                </label>
              </div>

              {hasCars && (
                <div className="flex flex-col gap-3 pt-2">
                  {vehicles.map((v, idx) => (
                    <div key={v.id} className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1B2B4B]">Vehicle #{idx + 1}</span>
                        {vehicles.length > 1 && (
                          <button
                            onClick={() => handleRemoveVehicle(v.id)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => handleUpdateVehicle(v.id, "name", e.target.value)}
                          placeholder="Label (e.g. My SUV, Car 1)"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                        />
                        <select
                          value={v.size}
                          onChange={(e) => handleUpdateVehicle(v.id, "size", e.target.value as CarSize)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                        >
                          <option value="SMALL">Small / Hatchback</option>
                          <option value="MID_SUV">Mid-size SUV / Sedan</option>
                          <option value="LUXURY">4WD / Performance</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddVehicle}
                    className="py-1.5 px-3 bg-slate-100 text-zinc-700 text-xs font-bold rounded-lg hover:bg-slate-200 border border-zinc-200"
                  >
                    + Add Another Vehicle
                  </button>
                </div>
              )}
            </div>

            {/* Kids: Per Child Selection */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasKids}
                  onChange={(e) => {
                    setHasKids(e.target.checked);
                    if (e.target.checked && children.length === 0) {
                      setChildren([{ id: "child-1", name: "Child 1", stage: "PRIMARY", type: "PUBLIC" }]);
                    }
                  }}
                  className="w-4 h-4 text-[#2563eb] rounded-md"
                />
                Dependents / Children
              </label>

              {hasKids && (
                <div className="flex flex-col gap-3 pt-2">
                  {children.map((c, idx) => (
                    <div key={c.id} className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1B2B4B]">Child #{idx + 1}</span>
                        {children.length > 1 && (
                          <button
                            onClick={() => handleRemoveChild(c.id)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => handleUpdateChild(c.id, "name", e.target.value)}
                          placeholder="Child Name / Label"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                        />
                        <select
                          value={c.stage}
                          onChange={(e) => handleUpdateChild(c.id, "stage", e.target.value as SchoolStage)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                        >
                          <option value="CHILDCARE">Childcare / Daycare</option>
                          <option value="PRIMARY">Primary School</option>
                          <option value="SECONDARY">High School</option>
                        </select>
                        <select
                          value={c.type}
                          onChange={(e) => handleUpdateChild(c.id, "type", e.target.value as SchoolType)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200"
                        >
                          <option value="PUBLIC">Public</option>
                          <option value="CATHOLIC">Systemic / Catholic</option>
                          <option value="PRIVATE">Independent / Private</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddChild}
                    className="py-1.5 px-3 bg-slate-100 text-zinc-700 text-xs font-bold rounded-lg hover:bg-slate-200 border border-zinc-200"
                  >
                    + Add Another Child
                  </button>
                </div>
              )}
            </div>

            {/* Health & Wellbeing */}
            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPrivateHealth}
                  onChange={(e) => setHasPrivateHealth(e.target.checked)}
                  className="w-4 h-4 text-[#2563eb] rounded-md"
                />
                Private Health Cover
              </label>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasGym}
                  onChange={(e) => setHasGym(e.target.checked)}
                  className="w-4 h-4 text-[#2563eb] rounded-md"
                />
                Gym / Fitness
              </label>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
              >
                Review Estimated Budget →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Category & Cap Customization */}
        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[#1B2B4B]">⚙️ Review Your Estimated Budget</h2>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === "cat" ? null : "cat")}
                  className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                >
                  ℹ️
                </button>
              </div>
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                Based on your answers, we&apos;ve estimated your monthly bills, goal funds, and everyday spending. You can tweak amounts or remove categories.
              </p>
              {activeTooltip === "cat" && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                  Everyday spending categories (groceries, dining, entertainment) pool together into your primary spending bucket while maintaining individual tracking tags.
                </div>
              )}
            </div>

            {/* Everyday Spending Categories */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Everyday Spending Categories</span>
              {activeEveryday.map((cat) => {
                const freq = categoryFrequencies[cat.name] || "MONTHLY";
                const displayVal = convertFromMonthly(cat.monthlyAud, freq);
                return (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={displayVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const monthly = convertToMonthly(val, freq);
                          setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                        }}
                        className="w-24 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-white"
                      />
                      <select
                        value={freq}
                        onChange={(e) => {
                          const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                          setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                        }}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white text-zinc-600"
                      >
                        <option value="WEEKLY">/ week</option>
                        <option value="FORTNIGHTLY">/ fortnight</option>
                        <option value="MONTHLY">/ month</option>
                        <option value="YEARLY">/ year</option>
                      </select>
                      <button
                        onClick={() => handleRemoveCategory(cat.name)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Regular Bills List */}
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Regular Bills & Obligations</span>
              {activeRegular.map((cat) => {
                const freq = categoryFrequencies[cat.name] || "MONTHLY";
                const displayVal = convertFromMonthly(cat.monthlyAud, freq);
                return (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={displayVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const monthly = convertToMonthly(val, freq);
                          setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                        }}
                        className="w-24 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-white"
                      />
                      <select
                        value={freq}
                        onChange={(e) => {
                          const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                          setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                        }}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white text-zinc-600"
                      >
                        <option value="WEEKLY">/ week</option>
                        <option value="FORTNIGHTLY">/ fortnight</option>
                        <option value="MONTHLY">/ month</option>
                        <option value="YEARLY">/ year</option>
                      </select>
                      <button
                        onClick={() => handleRemoveCategory(cat.name)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Goal Sinking Funds List */}
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Savings & Goal Funds</span>
              {activeGoals.map((cat) => {
                const freq = categoryFrequencies[cat.name] || "MONTHLY";
                const displayVal = convertFromMonthly(cat.monthlyAud, freq);
                return (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={displayVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const monthly = convertToMonthly(val, freq);
                          setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                        }}
                        className="w-24 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-white"
                      />
                      <select
                        value={freq}
                        onChange={(e) => {
                          const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                          setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                        }}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white text-zinc-600"
                      >
                        <option value="WEEKLY">/ week</option>
                        <option value="FORTNIGHTLY">/ fortnight</option>
                        <option value="MONTHLY">/ month</option>
                        <option value="YEARLY">/ year</option>
                      </select>
                      <button
                        onClick={() => handleRemoveCategory(cat.name)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Custom Category Form */}
            <div className="flex flex-col gap-2 p-3 bg-zinc-100/60 rounded-xl border border-zinc-200/60">
              <span className="text-xs font-bold text-[#1B2B4B]">Add Custom Category</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Category Name"
                  value={customCatName}
                  onChange={(e) => setCustomCatName(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                />
                <select
                  value={customCatType}
                  onChange={(e) => setCustomCatType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                >
                  <option value="REGULAR">Regular Bill</option>
                  <option value="GOAL">Savings Goal</option>
                  <option value="EVERYDAY">Everyday Spend</option>
                </select>
                <input
                  type="number"
                  placeholder="Monthly ($)"
                  value={customCatAmount}
                  onChange={(e) => setCustomCatAmount(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
                />
                <button
                  onClick={handleAddCustomCategory}
                  className="py-1.5 px-3 bg-[#1B2B4B] text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                >
                  + Add Category
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
              >
                Review Summary & Launch →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Waterfall Preview */}
        {step === 4 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[#1B2B4B]">📊 Monthly Budget Plan Summary</h2>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === "sum" ? null : "sum")}
                  className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                >
                  ℹ️
                </button>
              </div>
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                Here is how your total monthly income is distributed into your Everyday pool, Bills, and Savings goals.
              </p>
              {activeTooltip === "sum" && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                  When paychecks land, Money Matters automatically funds your bills and savings targets first, leaving your everyday spending pool fully clear for un-guilt discretionary spending.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-blue-700">Monthly Net Income</span>
                <span className="text-xl font-black text-[#1B2B4B]">${estimation.totalMonthlyIncomeAud.toLocaleString()}</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-emerald-700">Total Allocated</span>
                <span className="text-xl font-black text-[#1B2B4B]">${totalAllocatedMonthly.toLocaleString()}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${
                estimation.totalMonthlyIncomeAud >= totalAllocatedMonthly
                  ? "bg-teal-50/60 border-teal-200/80 text-teal-700"
                  : "bg-red-50/60 border-red-200/80 text-red-700"
              }`}>
                <span className="text-[10px] font-black uppercase">Net Surplus / Deficit</span>
                <span className="text-xl font-black text-[#1B2B4B]">
                  ${(estimation.totalMonthlyIncomeAud - totalAllocatedMonthly).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 text-xs font-medium text-zinc-600">
              <div className="flex justify-between">
                <span>Everyday Spending Target:</span>
                <span className="font-bold text-[#1B2B4B]">${totalEverydayMonthly.toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between">
                <span>Regular Bills Target:</span>
                <span className="font-bold text-[#1B2B4B]">${totalRegularMonthly.toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between">
                <span>Savings & Goal Target:</span>
                <span className="font-bold text-[#1B2B4B]">${totalGoalMonthly.toLocaleString()} / mo</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                ← Back
              </button>
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-8 py-3 text-xs font-bold rounded-xl bg-[#22c55e] text-white hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Saving Budget...</span>
                  </>
                ) : (
                  <span>{isRerun ? "Apply Budget Changes ✨" : "Save & Complete Setup 🚀"}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Reconciliation & Budget Impact Review Modal */}
        {showReconcileModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-6 border border-zinc-200">
              <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3">
                <span className="text-[10px] font-black uppercase text-[#00B4A6]">Budget Reconciliation Review</span>
                <h3 className="text-xl font-black text-[#1B2B4B]">Reconcile & Apply Budget Changes</h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Review the cap diffs and category adjustments before updating your household budget.
                </p>
              </div>

              {/* Cap Diffs Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-zinc-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-500">Regular Bills Target</span>
                  <span className="text-sm font-black text-[#1B2B4B]">${totalRegularMonthly.toLocaleString()} / mo</span>
                  <span className={`text-[11px] font-bold ${
                    totalRegularMonthly - currentBillsCap >= 0 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {totalRegularMonthly - currentBillsCap >= 0 ? `+${totalRegularMonthly - currentBillsCap}` : totalRegularMonthly - currentBillsCap} diff vs current
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-zinc-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-500">Everyday Spending Pool</span>
                  <span className="text-sm font-black text-[#1B2B4B]">${totalEverydayMonthly.toLocaleString()} / mo</span>
                  <span className={`text-[11px] font-bold ${
                    totalEverydayMonthly - currentEverydayCap >= 0 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {totalEverydayMonthly - currentEverydayCap >= 0 ? `+${totalEverydayMonthly - currentEverydayCap}` : totalEverydayMonthly - currentEverydayCap} diff vs current
                  </span>
                </div>
              </div>

              {/* Effective Date & Protection Notice */}
              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-800 font-medium flex flex-col gap-1">
                <span className="font-bold">🗓️ Next Payday Effective Date:</span>
                <span>Your new pool target caps and category limits will take effect on your next scheduled payday allocation. Historical transactions will remain preserved.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleConfirmReconcile}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-bold bg-[#22c55e] text-white rounded-xl hover:bg-emerald-600 shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      <span>Reconciling...</span>
                    </>
                  ) : (
                    <span>Confirm & Reconcile Budget ✨</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discard Changes Modal */}
        {showDiscardModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-zinc-200">
              <h3 className="text-lg font-black text-[#1B2B4B]">Discard Changes?</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Are you sure you want to leave setup? Any un-saved setup changes will be discarded.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDiscardModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleConfirmDiscard}
                  className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
