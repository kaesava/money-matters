"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { getTotalSetupSteps } from "@money-matters/types";
import { SetupIncomeStep } from "./components/SetupIncomeStep";
import { SetupBankAccountsStep } from "./components/SetupBankAccountsStep";
import { SetupGoalsStep } from "./components/SetupGoalsStep";
import { SetupLifestyleStep } from "./components/SetupLifestyleStep";
import { SetupCategoriesStep } from "./components/SetupCategoriesStep";
import { SetupDiscardModal } from "./components/SetupDiscardModal";
import { PaydaySandboxModal } from "./components/PaydaySandboxModal";
import { SetupHeaderBar } from "./components/SetupHeaderBar";
import { EnvelopeFormModal, EnvelopeDraftPayload, EnvelopeFormModalProps } from "../../components/web/EnvelopeFormModal";
import { useSetupWizardState } from "./hooks/useSetupWizardState";

function SetupWizardContent() {
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [showAddEnvelopeModal, setShowAddEnvelopeModal] = useState(false);
  const [envelopeToEditDraft, setEnvelopeToEditDraft] = useState<EnvelopeFormModalProps["categoryToEdit"]>(null);
  const state = useSetupWizardState();

  const totalSteps = getTotalSetupSteps(state.isRerun);
  const isReviewStep = state.step === 5 || (state.isRerun && state.step === 3);

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
          onCancel={() => state.setShowDiscardModal(true)}
        />

        {/* Step 1: Incomes */}
        {state.step === 1 && (
          <SetupIncomeStep
            incomes={state.incomes}
            isRerun={state.isRerun}
            onAddIncome={() => {
              const id = `inc-${Date.now()}`;
              state.setIncomes((prev) => [
                ...prev,
                {
                  id,
                  name: `Income ${prev.length + 1}`,
                  amount: state.isAud ? 2000 : 0,
                  frequency: "MONTHLY",
                  type: "SALARY",
                  startDate: new Intl.DateTimeFormat("en-CA").format(new Date()),
                },
              ]);
            }}
            onUpdateIncome={state.handleUpdateIncome}
            onRemoveIncome={state.handleRemoveIncome}
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
            isAud={state.isAud}
            onAddGoal={(g) => {
              const id = `g-${Date.now()}`;
              state.setGoals((prev) => [...prev, { ...g, id }]);
            }}
            onUpdateGoal={state.handleUpdateGoal}
            onRemoveGoal={state.handleRemoveGoal}
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
            estimatedBillsMonthly={state.totalRegularMonthly}
            estimatedEverydayMonthly={state.totalEverydayMonthly}
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
            onRemoveCategory={(name) => {
              state.setRemovedCategoryNames((prev) => new Set(prev).add(name));
              const matchedGoal = state.goals.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
              if (matchedGoal) {
                state.handleRemoveGoal(matchedGoal.id);
              }
            }}
            onOpenAddEnvelope={() => {
              setEnvelopeToEditDraft(null);
              setShowAddEnvelopeModal(true);
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
            onToggleBillType={(name, newType) => state.setBillTypeOverrides((prev) => ({ ...prev, [name]: newType }))}
            onEditCategory={(cat) => {
              const rawFreq = state.categoryFrequencies[cat.name] || (cat.budgetFrequency === "ANNUALLY" ? "YEARLY" : cat.budgetFrequency) || "MONTHLY";
              const displayAmt =
                cat.type === "GOAL"
                  ? cat.enteredAmount ?? cat.targetAmount ?? cat.monthlyAud
                  : state.convertFromMonthly(
                      cat.monthlyAud,
                      rawFreq as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
                    );
              const budgetFreq = rawFreq === "YEARLY" ? "ANNUALLY" : rawFreq;
              setEnvelopeToEditDraft({
                id: cat.id || `temp-${cat.name}`,
                name: cat.name,
                type: cat.type,
                envelopeType: cat.envelopeType || (cat.type === "EVERYDAY" ? "EVERYDAY" : cat.type === "GOAL" ? "GOAL" : "BILL"),
                fundingMode: cat.fundingMode || (cat.type === "EVERYDAY" || cat.type === "GOAL" ? "TARGET_BALANCE" : "RECURRING"),
                isPriority: cat.isPriority ?? true,
                isSurplusTarget: cat.isSurplusTarget ?? false,
                bankAccountId: cat.bankAccountId || state.bankAccounts[0]?.id,
                safetyBufferFloor: cat.safetyBufferFloor !== undefined ? String(cat.safetyBufferFloor) : "0.00",
                monthlyAmount: String(cat.monthlyAud || "0"),
                enteredAmount: String(displayAmt || "0"),
                targetAmount: String(cat.targetAmount ?? displayAmt ?? "0"),
                budgetFrequency: budgetFreq,
                startDate: cat.startDate,
                endDate: cat.endDate,
                rrule: cat.rrule,
                generateEvents: cat.generateEvents ?? true,
                hasScheduledEvents: state.isRerun ? Boolean(cat.hasScheduledEvents) : false,
              });
              setShowAddEnvelopeModal(true);
            }}
            isRerun={state.isRerun}
          />
        )}

        <EnvelopeFormModal
          isOpen={showAddEnvelopeModal}
          onClose={() => {
            setShowAddEnvelopeModal(false);
            setEnvelopeToEditDraft(null);
          }}
          categoryToEdit={envelopeToEditDraft}
          bankAccounts={state.bankAccounts}
          onSaveDraft={(draft: EnvelopeDraftPayload) => {
            const oldName = envelopeToEditDraft?.name;
            if (oldName && oldName.trim().toLowerCase() !== draft.name.trim().toLowerCase()) {
              state.setRemovedCategoryNames((prev) => new Set(prev).add(oldName));
            }
            if (draft.isSurplusTarget) {
              state.setGoals((prev) => prev.map((g) => ({ ...g, isSurplusTarget: false })));
              state.setCustomCategories((prev) => prev.map((c) => ({ ...c, isSurplusTarget: false })));
            }
            const num = parseFloat(draft.monthlyAmount || draft.targetAmount || "0") || 0;
            if (draft.type === "GOAL") {
              const id = envelopeToEditDraft?.id && !envelopeToEditDraft.id.startsWith("temp-") ? envelopeToEditDraft.id : `g-${Date.now()}`;
              const targetVal = parseFloat(draft.targetAmount || draft.enteredAmount || String(num)) || 0;
              const enteredVal = parseFloat(draft.enteredAmount || draft.targetAmount || String(num)) || 0;
              let goalMonthly = num;
              if (draft.fundingMode === "TARGET_BALANCE" && !draft.monthlyAmount) {
                const now = new Date();
                const target = draft.endDate ? new Date(draft.endDate) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
                goalMonthly = Math.round(targetVal / months);
              }
              state.setGoals((prev) => {
                const existing = prev.filter(
                  (g) =>
                    g.id !== id &&
                    g.name.trim().toLowerCase() !== draft.name.trim().toLowerCase() &&
                    (!oldName || g.name.trim().toLowerCase() !== oldName.trim().toLowerCase())
                );
                return [
                  ...existing,
                  {
                    id,
                    name: draft.name,
                    targetAmount: targetVal,
                    enteredAmount: enteredVal,
                    dueDate: draft.fundingMode === "RECURRING" ? null : draft.endDate || null,
                    fundingMode: draft.fundingMode || "TARGET_BALANCE",
                    isPriority: draft.isPriority ?? true,
                    isSurplusTarget: draft.isSurplusTarget ?? false,
                    bankAccountId: draft.bankAccountId,
                    monthlyAmount: goalMonthly,
                    budgetFrequency: draft.budgetFrequency || "MONTHLY",
                    startDate: draft.startDate,
                    rrule: draft.rrule,
                    icon: "target",
                  },
                ];
              });
              state.setRemovedCategoryNames((prev) => {
                const next = new Set(prev);
                next.delete(draft.name);
                return next;
              });
            } else {
              const existingId = envelopeToEditDraft?.id && !envelopeToEditDraft.id.startsWith("temp-") ? envelopeToEditDraft.id : undefined;
              const updatedMonthly = draft.type === "EVERYDAY" ? (parseFloat(envelopeToEditDraft?.monthlyAmount || "0") || num) : num;
              state.setCustomCategories((prev) => {
                const existing = prev.filter(
                  (c) =>
                    (!existingId || c.id !== existingId) &&
                    c.name.trim().toLowerCase() !== draft.name.trim().toLowerCase() &&
                    (!oldName || c.name.trim().toLowerCase() !== oldName.trim().toLowerCase())
                );
                return [
                  ...existing,
                  {
                    id: existingId,
                    name: draft.name,
                    type: draft.type,
                    envelopeType: draft.envelopeType,
                    fundingMode: draft.fundingMode,
                    isPriority: draft.isPriority ?? true,
                    isSurplusTarget: draft.isSurplusTarget ?? false,
                    bankAccountId: draft.bankAccountId,
                    safetyBufferFloor: draft.safetyBufferFloor ? parseFloat(draft.safetyBufferFloor) : 0,
                    enteredAmount: draft.enteredAmount ? parseFloat(draft.enteredAmount) : updatedMonthly,
                    targetAmount: draft.targetAmount ? parseFloat(draft.targetAmount) : null,
                    monthlyAud: updatedMonthly,
                    startDate: draft.startDate,
                    endDate: draft.endDate,
                    rrule: draft.rrule,
                    budgetFrequency: draft.budgetFrequency,
                    generateEvents: draft.generateEvents,
                    icon: draft.type === "BILL" ? "pin" : "wallet",
                  },
                ];
              });
              state.setRemovedCategoryNames((prev) => {
                const next = new Set(prev);
                next.delete(draft.name);
                return next;
              });
              if (draft.budgetFrequency) {
                state.setCategoryFrequencies((prev) => ({
                  ...prev,
                  [draft.name]:
                    draft.budgetFrequency === "ANNUALLY"
                      ? "YEARLY"
                      : (draft.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY"),
                }));
              }
              if (draft.type !== "EVERYDAY") {
                state.setAmountOverrides((prev) => ({
                  ...prev,
                  [draft.name]: updatedMonthly,
                }));
              }
              if (draft.fundingMode === "TARGET_BALANCE") {
                state.setBillTypeOverrides((prev) => ({
                  ...prev,
                  [draft.name]: "TARGET_BALANCE",
                }));
              } else if (draft.fundingMode === "RECURRING") {
                state.setBillTypeOverrides((prev) => ({
                  ...prev,
                  [draft.name]: "RECURRING",
                }));
              }
            }
            setShowAddEnvelopeModal(false);
            setEnvelopeToEditDraft(null);
          }}
        />

        <SetupDiscardModal
          isOpen={state.showDiscardModal}
          onClose={() => state.setShowDiscardModal(false)}
          onConfirm={state.handleDiscard}
          isLoading={state.isDiscarding}
        />

        <PaydaySandboxModal
          isOpen={showSandboxModal}
          onClose={() => setShowSandboxModal(false)}
          onFinish={() => {
            setShowSandboxModal(false);
            state.handleFinish();
          }}
          incomes={state.incomes}
          bankAccounts={state.bankAccounts}
          activeEveryday={state.activeEveryday}
          activeRegular={state.activeRegular}
          activeGoals={state.activeGoals}
          goals={state.goals}
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
