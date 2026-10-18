"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { SetupIncomeStep } from "./components/SetupIncomeStep";
import { SetupBankAccountsStep } from "./components/SetupBankAccountsStep";
import { SetupGoalsStep } from "./components/SetupGoalsStep";
import { SetupLifestyleStep } from "./components/SetupLifestyleStep";
import { SetupCategoriesStep } from "./components/SetupCategoriesStep";
import { SetupDiscardModal } from "./components/SetupDiscardModal";
import { PaydaySandboxModal } from "./components/PaydaySandboxModal";
import { SetupBalanceSweepModal } from "./components/SetupBalanceSweepModal";
import { SetupHeaderBar } from "./components/SetupHeaderBar";
import { useSetupWizardState } from "./hooks/useSetupWizardState";

function SetupWizardContent() {
  const [showSandboxModal, setShowSandboxModal] = React.useState(false);
  const state = useSetupWizardState();

  const totalSteps = state.isRerun ? 2 : 4;
  const isReviewStep = state.isRerun ? state.step === 3 : state.step === 5;

  if (state.isRerun && state.isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-10 bg-zinc-200/70 rounded-xl animate-pulse" />
          <div className="h-32 bg-zinc-200/50 rounded-2xl animate-pulse" />
          <div className="h-64 bg-zinc-200/40 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <SetupHeaderBar
          isRerun={state.isRerun}
          step={state.step}
          totalSteps={totalSteps}
          isReviewStep={isReviewStep}
          onCancel={() => state.setShowDiscardModal(true)}
        />

        {/* Step 1: Incomes */}
        {state.step === 1 && (
          <SetupIncomeStep
            incomes={state.incomes}
            isRerun={state.isRerun}
            dirtyIncomeIds={state.dirtyIncomeIds}
            onAddIncome={() => {
              const id = `inc-${Date.now()}`;
              state.setIncomes((prev) => [
                ...prev,
                {
                  id,
                  name: `Income ${prev.length + 1}`,
                  amount: 2000,
                  frequency: "MONTHLY",
                  type: "SALARY",
                  startDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date()),
                },
              ]);
            }}
            onUpdateIncome={state.handleUpdateIncome}
            onRemoveIncome={state.handleRemoveIncome}
            onSaveIncome={state.handleSaveIncomeImmediate}
            onNext={state.handleNextFromIncomes}
            totalSteps={totalSteps}
          />
        )}

        {/* First-run Step 2: Bank Accounts & Allocation */}
        {!state.isRerun && state.step === 2 && (
          <SetupBankAccountsStep
            accounts={state.bankAccounts}
            onAddAccount={state.handleAddAccount}
            onUpdateAccount={state.handleUpdateAccount}
            onRemoveAccount={state.handleRemoveAccount}
            onBack={() => state.setStep(1)}
            onNext={() => state.setStep(3)}
            totalSteps={totalSteps}
          />
        )}

        {/* Step 2 on Rerun / Step 3 on First Run: Goals */}
        {((state.isRerun && state.step === 2) || (!state.isRerun && state.step === 3)) && (
          <SetupGoalsStep
            goals={state.goals}
            isRerun={state.isRerun}
            dirtyGoalIds={state.dirtyGoalIds}
            onAddGoal={(g) => {
              const id = `g-${Date.now()}`;
              state.setGoals((prev) => [...prev, { ...g, id }]);
            }}
            onUpdateGoal={state.handleUpdateGoal}
            onRemoveGoal={state.handleRemoveGoal}
            onSaveGoal={state.handleSaveGoalImmediate}
            onBack={() => state.setStep(state.isRerun ? 1 : 2)}
            onNext={state.handleNextFromGoals}
            totalSteps={totalSteps}
          />
        )}

        {/* First Run Step 4: Lifestyle Quiz */}
        {!state.isRerun && state.step === 4 && (
          <SetupLifestyleStep
            country={state.country}
            housingType={state.housingType}
            setHousingType={state.setHousingType}
            hasCars={state.hasCars}
            setHasCars={state.setHasCars}
            vehicles={state.vehicles}
            onAddVehicle={() => {
              const id = `veh-${Date.now()}`;
              state.setVehicles((prev) => [...prev, { id, name: `Vehicle ${prev.length + 1}`, size: "MID_SUV" }]);
            }}
            onUpdateVehicle={(id, field, value) => {
              state.setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
            }}
            onRemoveVehicle={(id) => state.setVehicles((prev) => prev.filter((v) => v.id !== id))}
            usePublicTransport={state.usePublicTransport}
            setUsePublicTransport={state.setUsePublicTransport}
            useRideshare={state.useRideshare}
            setUseRideshare={state.setUseRideshare}
            hasKids={state.hasKids}
            setHasKids={state.setHasKids}
            childrenList={state.children}
            onAddChild={() => {
              const id = `child-${Date.now()}`;
              state.setChildren((prev) => [...prev, { id, name: `Child ${prev.length + 1}`, stage: "PRIMARY", type: "PUBLIC" }]);
            }}
            onUpdateChild={(id, field, value) => {
              state.setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
            }}
            onRemoveChild={(id) => state.setChildren((prev) => prev.filter((c) => c.id !== id))}
            hasPrivateHealth={state.hasPrivateHealth}
            setHasPrivateHealth={state.setHasPrivateHealth}
            hasGym={state.hasGym}
            setHasGym={state.setHasGym}
            hasMedicalOutofPocket={state.hasMedicalOutofPocket}
            setHasMedicalOutofPocket={state.setHasMedicalOutofPocket}
            hasDebt={state.hasDebt}
            setHasDebt={state.setHasDebt}
            debtMonthlyRepayment={state.debtMonthlyRepayment}
            setDebtMonthlyRepayment={state.setDebtMonthlyRepayment}
            hasPets={state.hasPets}
            setHasPets={state.setHasPets}
            petsCount={state.petsCount}
            setPetsCount={state.setPetsCount}
            hasCharityGiving={state.hasCharityGiving}
            setHasCharityGiving={state.setHasCharityGiving}
            charityMonthlyAmount={state.charityMonthlyAmount}
            setCharityMonthlyAmount={state.setCharityMonthlyAmount}
            weeklyGroceries={state.weeklyGroceries}
            setWeeklyGroceries={state.setWeeklyGroceries}
            weeklyDining={state.weeklyDining}
            setWeeklyDining={state.setWeeklyDining}
            weeklyPersonal={state.weeklyPersonal}
            setWeeklyPersonal={state.setWeeklyPersonal}
            onBack={() => state.setStep(3)}
            onNext={() => state.setStep(5)}
            totalSteps={totalSteps}
          />
        )}

        {/* Review Budget Summary (Step 3 for rerun, Step 5 for initial setup) */}
        {isReviewStep && (
          <SetupCategoriesStep
            activeEveryday={state.activeEveryday}
            activeRegular={state.activeRegular}
            activeGoals={state.activeGoals}
            goals={state.goals}
            categoryFrequencies={state.categoryFrequencies}
            setCategoryFrequencies={state.setCategoryFrequencies}
            setAmountOverrides={state.setAmountOverrides}
            onRemoveCategory={(name) => state.setRemovedCategoryNames((prev) => new Set(prev).add(name))}
            customCatName={state.customCatName}
            setCustomCatName={state.setCustomCatName}
            customCatType={state.customCatType}
            setCustomCatType={state.setCustomCatType}
            customCatAmount={state.customCatAmount}
            setCustomCatAmount={state.setCustomCatAmount}
            onAddCustomCategory={() => {
              if (!state.customCatName.trim()) return;
              const amount = parseFloat(state.customCatAmount) || 0;
              state.setCustomCategories((prev) => [
                ...prev,
                {
                  name: state.customCatName.trim(),
                  type: state.customCatType,
                  monthlyAud: amount,
                  icon: state.customCatType === "REGULAR" ? "pin" : state.customCatType === "GOAL" ? "target" : "wallet",
                },
              ]);
              state.setCustomCatName("");
              state.setCustomCatAmount("100");
            }}
            convertToMonthly={state.convertToMonthly}
            convertFromMonthly={state.convertFromMonthly}
            totalMonthlyIncomeAud={state.estimation.totalMonthlyIncomeAud}
            totalAllocatedMonthly={state.totalAllocatedMonthly}
            totalEverydayMonthly={state.totalEverydayMonthly}
            totalRegularMonthly={state.totalRegularMonthly}
            totalGoalMonthly={state.totalGoalMonthly}
            isSubmitting={state.isSubmitting}
            onBack={() => state.setStep(state.isRerun ? 2 : 4)}
            onFinish={state.handleFinish}
            onSimulatePayday={() => setShowSandboxModal(true)}
            isRerun={state.isRerun}
          />
        )}

        <SetupDiscardModal
          isOpen={state.showDiscardModal}
          onClose={() => state.setShowDiscardModal(false)}
          onConfirm={state.handleDiscard}
        />

        <PaydaySandboxModal
          isOpen={showSandboxModal}
          onClose={() => setShowSandboxModal(false)}
          onFinish={() => {
            setShowSandboxModal(false);
            state.handleFinish();
          }}
          estimatedBills={state.totalRegularMonthly}
          estimatedGoals={state.totalGoalMonthly}
          defaultPaycheck={state.incomes[0]?.amount || 2500}
        />

        <SetupBalanceSweepModal
          activeSweepPool={state.activeSweepPool}
          availablePools={state.availablePools}
          selectedSweepDest={state.selectedSweepDest}
          onSelectDest={state.setSelectedSweepDest}
          onCancel={() => state.setActiveSweepPool(null)}
          onConfirm={state.confirmSweepAndRemove}
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
