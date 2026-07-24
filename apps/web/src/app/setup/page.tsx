"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { PresetCategory, CategorySelectStep } from "./components/CategorySelectStep";
import { IncomeSetupStep } from "./components/IncomeSetupStep";
import { CategoryTargetsStep } from "./components/CategoryTargetsStep";
import { BankAccountsSetupStep } from "./components/BankAccountsSetupStep";

const PRESETS: PresetCategory[] = [
  { id: "emergency", name: "Emergency Fund", type: "GOAL", icon: "🛡️" },
  { id: "holiday", name: "Holiday / Travel", type: "GOAL", icon: "✈️" },
  { id: "car", name: "Car Replacement", type: "GOAL", icon: "🚗" },
  { id: "rent", name: "Rent / Mortgage", type: "REGULAR", icon: "🏡" },
  { id: "electricity", name: "Electricity", type: "REGULAR", icon: "⚡" },
  { id: "internet", name: "Internet", type: "REGULAR", icon: "📡" },
  { id: "insurance", name: "Insurance", type: "REGULAR", icon: "📋" },
];

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Income Sources States
  const [incomeName, setIncomeName] = useState("");
  const [incomeType, setIncomeType] = useState<"SALARY" | "FREELANCE" | "OTHER">("SALARY");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeFreq, setIncomeFreq] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY">("FORTNIGHTLY");
  const [incomeStartDate, setIncomeStartDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [addedIncome, setAddedIncome] = useState<string[]>([]);
  const [addingIncome, setAddingIncome] = useState(false);

  // Step 2: Preset Categories Selection States
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    new Set(["emergency", "rent"])
  );
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<PresetCategory[]>([]);

  // Step 3: Configure Categories Targets & Schedules States
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [frequencies, setFrequencies] = useState<Record<string, string>>({});
  const [targetDates, setTargetDates] = useState<Record<string, string>>({});
  const [defaultExcessId, setDefaultExcessId] = useState("emergency");

  // Step 4: Bank Accounts States
  const [bankName, setBankName] = useState("");
  const [bankPurpose, setBankPurpose] = useState<"INCOME_LANDING" | "SAVINGS" | "EVERYDAY">("INCOME_LANDING");
  const [bankBalance, setBankBalance] = useState("0.00");
  const [bankOffset, setBankOffset] = useState(false);
  const [addedBanks, setAddedBanks] = useState<string[]>([]);
  const [addingBank, setAddingBank] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC Mutations
  const createIncomeSource = trpc.createIncomeSource.useMutation();
  const createIncomeSchedule = trpc.createIncomeSourceSchedule.useMutation();
  const createCategory = trpc.createCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const createBankAccount = trpc.createBankAccount.useMutation();

  const handleAddIncome = async () => {
    if (!incomeName.trim() || !incomeAmount.trim()) return;
    const numericAmount = parseFloat(incomeAmount);
    if (isNaN(numericAmount) || numericAmount < 0) return;
    
    setAddingIncome(true);
    try {
      const rrule =
        incomeFreq === "WEEKLY"
          ? "FREQ=WEEKLY"
          : incomeFreq === "FORTNIGHTLY"
          ? "FREQ=WEEKLY;INTERVAL=2"
          : "FREQ=MONTHLY";

      const source = await createIncomeSource.mutateAsync({
        name: incomeName.trim(),
        amount: numericAmount.toFixed(2),
      });

      await createIncomeSchedule.mutateAsync({
        incomeSourceId: source.id,
        rrule,
        startDate: incomeStartDate || new Date().toISOString().split("T")[0]!,
      });

      setAddedIncome((prev) => [...prev, `${incomeName.trim()} (${incomeFreq})`]);
      setIncomeName("");
      setIncomeAmount("");
    } catch (err) {
      console.error("Failed to add income source:", err);
    } finally {
      setAddingIncome(false);
    }
  };

  const togglePreset = (id: string) => {
    const next = new Set(selectedPresets);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPresets(next);
  };

  const handleAddCustomCategory = () => {
    if (!customCategoryName.trim()) return;
    const id = `custom-${Date.now()}`;
    const newCat: PresetCategory = {
      id,
      name: customCategoryName.trim(),
      type: "GOAL",
      icon: "📌",
    };
    setCustomCategories((prev) => [...prev, newCat]);
    setSelectedPresets((prev) => new Set(prev).add(id));
    setCustomCategoryName("");
  };

  const handleAddBank = async () => {
    if (!bankName.trim()) return;
    setAddingBank(true);
    try {
      await createBankAccount.mutateAsync({
        name: bankName.trim(),
        lastKnownBalance: (parseFloat(bankBalance) || 0).toFixed(2),
        unbudgetedBuffer: "0.00",
      });
      setAddedBanks((prev) => [...prev, bankName.trim()]);
      setBankName("");
      setBankBalance("0.00");
    } catch (err) {
      console.error("Failed to add bank account:", err);
    } finally {
      setAddingBank(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      const allPresets = [...PRESETS, ...customCategories];
      const selectedList = allPresets.filter((p) => selectedPresets.has(p.id));

      for (const cat of selectedList) {
        const targetAmt = targets[cat.id] || "0";
        const freq = (frequencies[cat.id] as "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") || "MONTHLY";
        const targetDate = targetDates[cat.id];
        const isExcess = defaultExcessId === cat.id;

        const created = await createCategory.mutateAsync({
          name: cat.name,
          type: cat.type,
          budgetFrequency: freq,
          isDefaultExcess: isExcess,
        });

        if (cat.type === "GOAL" && parseFloat(targetAmt) > 0) {
          await createCategorySchedule.mutateAsync({
            categoryId: created.id,
            targetAmount: parseFloat(targetAmt).toFixed(2),
            targetDate: targetDate || undefined,
          });
        }
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to finish setup:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPresets = [...PRESETS, ...customCategories];
  const selectedList = allPresets.filter((p) => selectedPresets.has(p.id));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-zinc-200/80 p-6 sm:p-8 flex flex-col gap-6">
        {/* Progress Bar Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="text-sm font-black text-[#1B2B4B]">Account Onboarding</span>
          </div>
          <span className="text-xs font-extrabold text-[#00B4A6] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Step {step} of 4
          </span>
        </div>

        {step === 1 && (
          <IncomeSetupStep
            incomeName={incomeName}
            setIncomeName={setIncomeName}
            incomeType={incomeType}
            setIncomeType={setIncomeType}
            incomeAmount={incomeAmount}
            setIncomeAmount={setIncomeAmount}
            incomeFreq={incomeFreq}
            setIncomeFreq={setIncomeFreq}
            incomeStartDate={incomeStartDate}
            setIncomeStartDate={setIncomeStartDate}
            addedIncome={addedIncome}
            addingIncome={addingIncome}
            onAddIncome={handleAddIncome}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <CategorySelectStep
            presets={PRESETS}
            selectedPresets={selectedPresets}
            togglePreset={togglePreset}
            customCategoryName={customCategoryName}
            setCustomCategoryName={setCustomCategoryName}
            customCategories={customCategories}
            onAddCustomCategory={handleAddCustomCategory}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <CategoryTargetsStep
            selectedList={selectedList}
            targets={targets}
            setTarget={(id, val) => setTargets((prev) => ({ ...prev, [id]: val }))}
            frequencies={frequencies}
            setFrequency={(id, val) => setFrequencies((prev) => ({ ...prev, [id]: val }))}
            targetDates={targetDates}
            setTargetDate={(id, val) => setTargetDates((prev) => ({ ...prev, [id]: val }))}
            defaultExcessId={defaultExcessId}
            setDefaultExcessId={setDefaultExcessId}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <BankAccountsSetupStep
            bankName={bankName}
            setBankName={setBankName}
            bankPurpose={bankPurpose}
            setBankPurpose={setBankPurpose}
            bankBalance={bankBalance}
            setBankBalance={setBankBalance}
            bankOffset={bankOffset}
            setBankOffset={setBankOffset}
            addedBanks={addedBanks}
            addingBank={addingBank}
            onAddBank={handleAddBank}
            onBack={() => setStep(3)}
            onComplete={handleCompleteSetup}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
