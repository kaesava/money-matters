"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { SetupIncomeStep } from "./components/SetupIncomeStep";
import { SetupGoalsStep } from "./components/SetupGoalsStep";
import { SetupLifestyleStep } from "./components/SetupLifestyleStep";
import { SetupCategoriesStep } from "./components/SetupCategoriesStep";
import { SetupDiscardModal } from "./components/SetupDiscardModal";
import { useSetupWizardState } from "./hooks/useSetupWizardState";

function SetupWizardContent() {
  const {
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
    setCustomCategories,
    customCatName,
    setCustomCatName,
    customCatType,
    setCustomCatType,
    customCatAmount,
    setCustomCatAmount,
    setRemovedCategoryNames,
    setAmountOverrides,
    categoryFrequencies,
    setCategoryFrequencies,
    showIcons,
    estimation,
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
  } = useSetupWizardState();

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {step === 1 && (
          <SetupIncomeStep
            incomes={incomes}
            onAddIncome={() => {
              const id = `inc-${Date.now()}`;
              setIncomes((prev) => [
                ...prev,
                { id, name: `Income ${prev.length + 1}`, amount: 2000, frequency: "MONTHLY", type: "SALARY" },
              ]);
            }}
            onUpdateIncome={(id, field, value) => {
              setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: value } : inc)));
            }}
            onRemoveIncome={(id) => setIncomes((prev) => prev.filter((inc) => inc.id !== id))}
            onNext={() => setStep(2)}
            showIcons={showIcons}
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
            showIcons={showIcons}
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
            hasMedicalOutofPocket={hasMedicalOutofPocket}
            setHasMedicalOutofPocket={setHasMedicalOutofPocket}
            hasDebt={hasDebt}
            setHasDebt={setHasDebt}
            debtMonthlyRepayment={debtMonthlyRepayment}
            setDebtMonthlyRepayment={setDebtMonthlyRepayment}
            hasPets={hasPets}
            setHasPets={setHasPets}
            petsCount={petsCount}
            setPetsCount={setPetsCount}
            hasCharityGiving={hasCharityGiving}
            setHasCharityGiving={setHasCharityGiving}
            charityMonthlyAmount={charityMonthlyAmount}
            setCharityMonthlyAmount={setCharityMonthlyAmount}
            weeklyGroceries={weeklyGroceries}
            setWeeklyGroceries={setWeeklyGroceries}
            weeklyDining={weeklyDining}
            setWeeklyDining={setWeeklyDining}
            weeklyPersonal={weeklyPersonal}
            setWeeklyPersonal={setWeeklyPersonal}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            showIcons={showIcons}
          />
        )}

        {step === 4 && (
          <SetupCategoriesStep
            activeEveryday={activeEveryday}
            activeRegular={activeRegular}
            activeGoals={activeGoals}
            goals={goals}
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
            totalMonthlyIncomeAud={estimation.totalMonthlyIncomeAud}
            totalAllocatedMonthly={totalAllocatedMonthly}
            totalEverydayMonthly={totalEverydayMonthly}
            totalRegularMonthly={totalRegularMonthly}
            totalGoalMonthly={totalGoalMonthly}
            isSubmitting={isSubmitting}
            onBack={() => setStep(3)}
            onFinish={handleFinish}
            showIcons={showIcons}
          />
        )}

        <SetupDiscardModal
          isOpen={showDiscardModal}
          onClose={() => setShowDiscardModal(false)}
          onConfirm={handleDiscard}
        />
      </div>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">{t("common.loading")}</div>}>
      <SetupWizardContent />
    </React.Suspense>
  );
}
