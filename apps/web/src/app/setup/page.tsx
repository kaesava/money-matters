"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

// Preset Categories structure
interface PresetCategory {
  id: string;
  name: string;
  type: "MAJOR" | "RECURRING" | "EVERYDAY";
  icon: string;
}

const PRESETS: PresetCategory[] = [
  { id: "emergency", name: "Emergency Fund", type: "MAJOR", icon: "🛡️" },
  { id: "holiday", name: "Holiday / Travel", type: "MAJOR", icon: "✈️" },
  { id: "car", name: "Car Replacement", type: "MAJOR", icon: "🚗" },
  { id: "rent", name: "Rent / Mortgage", type: "RECURRING", icon: "🏡" },
  { id: "electricity", name: "Electricity", type: "RECURRING", icon: "⚡" },
  { id: "internet", name: "Internet", type: "RECURRING", icon: "📡" },
  { id: "insurance", name: "Insurance", type: "RECURRING", icon: "📋" },
  { id: "groceries", name: "Groceries", type: "EVERYDAY", icon: "🛒" },
  { id: "fuel", name: "Fuel", type: "EVERYDAY", icon: "⛽" },
  { id: "eating-out", name: "Eating Out", type: "EVERYDAY", icon: "🍽️" },
];

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Income Sources States
  const [incomeName, setIncomeName] = useState("");
  const [incomeType, setIncomeType] = useState<"SALARY" | "FREELANCE" | "OTHER">("SALARY");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeFreq, setIncomeFreq] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY">("FORTNIGHTLY");
  const [addedIncome, setAddedIncome] = useState<string[]>([]);
  const [addingIncome, setAddingIncome] = useState(false);

  // Step 2: Preset Categories Selection States
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    new Set(["emergency", "rent", "groceries"])
  );
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<PresetCategory[]>([]);

  // Step 3: Configure Categories Targets & Schedules States
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [frequencies, setFrequencies] = useState<Record<string, string>>({});
  const defaultExcessId = "emergency";

  // Step 4: Bank Accounts States
  const [bankName, setBankName] = useState("");
  const [bankPurpose, setBankPurpose] = useState<"INCOME_LANDING" | "SAVINGS" | "EVERYDAY">("INCOME_LANDING");
  const [bankBalance, setBankBalance] = useState("0.00");
  const [bankOffset, setBankOffset] = useState(false);
  const [addedBanks, setAddedBanks] = useState<string[]>([]);
  const [addingBank, setAddingBank] = useState(false);

  // tRPC Mutations
  const createIncomeSource = trpc.createIncomeSource.useMutation();
  const createIncomeSchedule = trpc.createIncomeSourceSchedule.useMutation();
  const createCategory = trpc.createCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const createBankAccount = trpc.createBankAccount.useMutation();

  // Step 1 Handlers
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
        type: incomeType,
        amount: numericAmount.toFixed(2),
      });

      await createIncomeSchedule.mutateAsync({
        incomeSourceId: source.id,
        rrule,
        startDate: new Date().toISOString().split("T")[0]!,
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

  // Step 2 Handlers
  const togglePreset = (id: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddCustomCategory = () => {
    if (!customCategoryName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newCat: PresetCategory = {
      id: newId,
      name: customCategoryName.trim(),
      type: "EVERYDAY",
      icon: "📦",
    };
    setCustomCategories((prev) => [...prev, newCat]);
    setSelectedPresets((prev) => new Set([...prev, newId]));
    setCustomCategoryName("");
  };

  const allSelectedCategories = [
    ...PRESETS.filter((p) => selectedPresets.has(p.id)),
    ...customCategories.filter((c) => selectedPresets.has(c.id)),
  ];

  const persistCategoriesAndNext = async () => {
    try {
      // Save all categories first
      const savedIds: Record<string, string> = {};
      
      let rank = 1;
      for (const cat of allSelectedCategories) {
        const isExcess = cat.id === defaultExcessId;
        const res = await createCategory.mutateAsync({
          name: cat.name,
          type: cat.type,
          isDefaultExcess: isExcess,
          icon: cat.icon,
          colour: "#00B4A6",
          priorityRank: cat.type !== "EVERYDAY" ? rank++ : undefined,
        });
        savedIds[cat.id] = res.id;
      }

      // Store resolved category mappings and advance
      sessionStorage.setItem("saved_category_ids", JSON.stringify(savedIds));
      setStep(3);
    } catch (err) {
      console.error("Failed to persist categories:", err);
    }
  };

  // Step 3 Handlers
  const saveTargetsAndNext = async () => {
    try {
      const savedIds = JSON.parse(sessionStorage.getItem("saved_category_ids") || "{}");
      
      const majorAndRecurring = allSelectedCategories.filter((c) => c.type !== "EVERYDAY");
      for (const cat of majorAndRecurring) {
        const dbId = savedIds[cat.id];
        if (!dbId) continue;

        const targetAmount = parseFloat(targets[cat.id] || "0");
        if (targetAmount <= 0) continue;

        // Default schedules
        await createCategorySchedule.mutateAsync({
          categoryId: dbId,
          targetAmount: targetAmount.toFixed(2),
          rrule: frequencies[cat.id] || "FREQ=MONTHLY",
        });
      }

      setStep(4);
    } catch (err) {
      console.error("Failed to save category schedules:", err);
    }
  };

  // Step 4 Handlers
  const handleAddBank = async () => {
    if (!bankName.trim()) return;
    const balanceNum = parseFloat(bankBalance) || 0;

    setAddingBank(true);
    try {
      await createBankAccount.mutateAsync({
        name: bankName.trim(),
        purpose: [bankPurpose],
        lastKnownBalance: balanceNum.toFixed(2),
        isOffset: bankOffset,
      });

      setAddedBanks((prev) => [...prev, bankName.trim()]);
      setBankName("");
      setBankBalance("0.00");
      setBankOffset(false);
    } catch (err) {
      console.error("Failed to add bank account:", err);
    } finally {
      setAddingBank(false);
    }
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-6 md:p-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-zinc-100 p-8 flex flex-col gap-8 relative overflow-hidden">
        
        {/* Progress header bar */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: s <= step ? "var(--dash-teal)" : "var(--dash-border)",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
            <span>Step {step} of 4</span>
            <span>Onboarding Status</span>
          </div>
        </div>

        {/* ── Step 1: Income Sources ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-[#1B2B4B]">{t("setup.income.title")}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t("setup.income.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fortnightly Salary"
                  value={incomeName}
                  onChange={(e) => setIncomeName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Net Income Amount</label>
                <input
                  type="number"
                  placeholder="e.g. 2400"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Income Type</label>
                <select
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value as "SALARY" | "FREELANCE" | "OTHER")}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                >
                  <option value="SALARY">Salary / PAYG</option>
                  <option value="FREELANCE">Freelance / Invoiced</option>
                  <option value="OTHER">Other Income</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Frequency</label>
                <select
                  value={incomeFreq}
                  onChange={(e) => setIncomeFreq(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY")}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddIncome}
                  disabled={addingIncome || !incomeName || !incomeAmount}
                  className="w-full bg-[#1B2B4B] text-white py-3 rounded-xl font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {addingIncome ? "Adding..." : "+ Add Income Source"}
                </button>
              </div>
            </div>

            {/* List of added income sources */}
            {addedIncome.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-extrabold text-zinc-400 uppercase">Registered Income Sources</p>
                <div className="flex flex-wrap gap-2">
                  {addedIncome.map((src, i) => (
                    <span key={i} className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold flex items-center gap-1.5">
                      ✓ {src}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={addedIncome.length === 0}
                className="px-8 py-3 rounded-xl bg-[#00B4A6] text-white text-sm font-extrabold hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Categories Selection ── */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-[#1B2B4B]">{t("setup.categories.title")}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t("setup.categories.subtitle")}</p>
            </div>

            {/* Preset selectors list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESETS.map((p) => {
                const isSelected = selectedPresets.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePreset(p.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? "bg-[#00B4A6]/10 border-[#00B4A6] text-[#1B2B4B] font-bold"
                        : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-xs truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom categories addition */}
            <div className="flex flex-col gap-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase">Add custom discretionary category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Subscriptions"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="px-4 py-2 rounded-xl bg-[#1B2B4B] text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={persistCategoriesAndNext}
                disabled={selectedPresets.size === 0}
                className="px-8 py-3 rounded-xl bg-[#00B4A6] text-white text-sm font-extrabold hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                Configure Targets →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Configure Category targets & schedules ── */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-[#1B2B4B]">{t("setup.configure.title")}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t("setup.configure.subtitle")}</p>
            </div>

            {/* Target configuring rows */}
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
              {allSelectedCategories
                .filter((c) => c.type !== "EVERYDAY")
                .map((cat) => (
                  <div key={cat.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-xs font-extrabold text-[#1B2B4B]">{cat.name}</span>
                    </div>

                    <div className="flex gap-2 items-center w-full sm:w-auto">
                      <input
                        type="number"
                        placeholder="Target $"
                        value={targets[cat.id] || ""}
                        onChange={(e) => setTargets({ ...targets, [cat.id]: e.target.value })}
                        className="w-24 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                      />
                      
                      <select
                        value={frequencies[cat.id] || "FREQ=MONTHLY"}
                        onChange={(e) => setFrequencies({ ...frequencies, [cat.id]: e.target.value })}
                        className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs focus:outline-none bg-white transition-colors"
                      >
                        <option value="FREQ=WEEKLY">Weekly</option>
                        <option value="FREQ=WEEKLY;INTERVAL=2">Fortnightly</option>
                        <option value="FREQ=MONTHLY">Monthly</option>
                      </select>
                    </div>
                  </div>
                ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={saveTargetsAndNext}
                className="px-8 py-3 rounded-xl bg-[#00B4A6] text-white text-sm font-extrabold hover:opacity-95 transition-opacity"
              >
                Setup Bank Accounts →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Bank Accounts ── */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-black text-[#1B2B4B]">{t("setup.bankAccounts.title")}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t("setup.bankAccounts.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Everyday Spend Account"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Initial Balance</label>
                <input
                  type="number"
                  placeholder="e.g. 0.00"
                  value={bankBalance}
                  onChange={(e) => setBankBalance(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1B2B4B] uppercase">Purpose / Tag</label>
                <select
                  value={bankPurpose}
                  onChange={(e) => setBankPurpose(e.target.value as "INCOME_LANDING" | "SAVINGS" | "EVERYDAY")}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#00B4A6] bg-white transition-colors"
                >
                  <option value="INCOME_LANDING">Salary Landing Account</option>
                  <option value="SAVINGS">Savings / Bill Account</option>
                  <option value="EVERYDAY">Everyday Discretionary</option>
                </select>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2 pt-2">
                <input
                  type="checkbox"
                  id="offset-flag"
                  checked={bankOffset}
                  onChange={(e) => setBankOffset(e.target.checked)}
                  className="w-4 h-4 text-[#00B4A6] border-zinc-300 rounded focus:ring-[#00B4A6]"
                />
                <label htmlFor="offset-flag" className="text-xs font-bold text-zinc-500">
                  This is a home loan offset account (do not generate transfers)
                </label>
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddBank}
                  disabled={addingBank || !bankName}
                  className="w-full bg-[#1B2B4B] text-white py-3 rounded-xl font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {addingBank ? "Adding..." : "+ Add Bank Account"}
                </button>
              </div>
            </div>

            {/* List of added banks */}
            {addedBanks.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-extrabold text-zinc-400 uppercase">Registered Bank Accounts</p>
                <div className="flex flex-wrap gap-2">
                  {addedBanks.map((name, i) => (
                    <span key={i} className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold flex items-center gap-1.5">
                      ✓ {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-bold hover:bg-zinc-50 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={addedBanks.length === 0}
                className="px-8 py-3 rounded-xl bg-[#00B4A6] text-white text-sm font-extrabold hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                Complete Setup 🎉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
