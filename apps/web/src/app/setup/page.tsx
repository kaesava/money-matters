"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { AUSTRALIAN_FAMILY_PRESETS, SetupPreset } from "@money-matters/types";
import { CategorySelectStep } from "./components/CategorySelectStep";
import { IncomeSetupStep } from "./components/IncomeSetupStep";

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Income Sources States
  const [incomeName, setIncomeName] = useState("My Salary");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeFreq, setIncomeFreq] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY">("FORTNIGHTLY");

  // Step 2: Preset Categories Selection States
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(() => {
    const defaults = AUSTRALIAN_FAMILY_PRESETS.filter(p => p.defaultSelected).map(p => p.id);
    return new Set(defaults);
  });
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<SetupPreset[]>([]);

  // Configure Categories Targets & Schedules States
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [defaultExcessId, setDefaultExcessId] = useState("emergency");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC Mutations
  const createIncomeSource = trpc.createIncomeSource.useMutation();
  const createCategory = trpc.createCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const generateEvents = trpc.generateNextIncomeEvents.useMutation();

  const togglePreset = (id: string) => {
    const next = new Set(selectedPresets);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPresets(next);

    // Keep excess pool pointing to a selected category if possible
    if (defaultExcessId === id && next.size > 0) {
      setDefaultExcessId(Array.from(next)[0]!);
    }
  };

  const handleAddCustomCategory = () => {
    if (!customCategoryName.trim()) return;
    const id = `custom-${Date.now()}`;
    const newCat: SetupPreset = {
      id,
      name: customCategoryName.trim(),
      type: "REGULAR",
      emoji: "📌",
      suggestedMonthlyAud: 100,
      defaultSelected: false,
    };
    setCustomCategories((prev) => [...prev, newCat]);
    setSelectedPresets((prev) => new Set(prev).add(id));
    setCustomCategoryName("");
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save main income source
      const numericAmount = parseFloat(incomeAmount) || 0;
      await createIncomeSource.mutateAsync({
        name: incomeName.trim(),
        amount: numericAmount.toFixed(2),
        isRecurring: true,
        startDate: new Date().toISOString().split("T")[0]!,
        frequency: incomeFreq,
      });

      // 2. Save categories and target schedules
      const allPresets = [...AUSTRALIAN_FAMILY_PRESETS, ...customCategories];
      const selectedList = allPresets.filter((p) => selectedPresets.has(p.id));

      for (const cat of selectedList) {
        // Fall back to suggested value if empty
        const targetAmt = targets[cat.id] || cat.suggestedMonthlyAud.toString();
        const isExcess = defaultExcessId === cat.id;

        const created = await createCategory.mutateAsync({
          name: cat.name,
          type: cat.type,
          budgetFrequency: "MONTHLY",
          isDefaultExcess: isExcess,
        });

        if (parseFloat(targetAmt) > 0) {
          await createCategorySchedule.mutateAsync({
            categoryId: created.id,
            targetAmount: parseFloat(targetAmt).toFixed(2),
          });
        }
      }

      // 3. Auto-generate upcoming transaction events
      await generateEvents.mutateAsync();

      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to finish setup:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Step {step} of 2
          </span>
        </div>

        {step === 1 && (
          <IncomeSetupStep
            incomeName={incomeName}
            setIncomeName={setIncomeName}
            incomeAmount={incomeAmount}
            setIncomeAmount={setIncomeAmount}
            incomeFreq={incomeFreq}
            setIncomeFreq={setIncomeFreq}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <CategorySelectStep
            selectedPresets={selectedPresets}
            togglePreset={togglePreset}
            customCategoryName={customCategoryName}
            setCustomCategoryName={setCustomCategoryName}
            customCategories={customCategories}
            onAddCustomCategory={handleAddCustomCategory}
            targets={targets}
            setTarget={(id, val) => setTargets((prev) => ({ ...prev, [id]: val }))}
            defaultExcessId={defaultExcessId}
            setDefaultExcessId={setDefaultExcessId}
            onBack={() => setStep(1)}
            onComplete={handleCompleteSetup}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
