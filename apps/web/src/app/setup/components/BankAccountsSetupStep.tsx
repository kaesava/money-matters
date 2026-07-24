import React from "react";

interface BankAccountsSetupStepProps {
  bankName: string;
  setBankName: (val: string) => void;
  bankPurpose: "INCOME_LANDING" | "SAVINGS" | "EVERYDAY";
  setBankPurpose: (val: "INCOME_LANDING" | "SAVINGS" | "EVERYDAY") => void;
  bankBalance: string;
  setBankBalance: (val: string) => void;
  bankOffset: boolean;
  setBankOffset: (val: boolean) => void;
  addedBanks: string[];
  addingBank: boolean;
  onAddBank: () => void;
  onBack: () => void;
  onComplete: () => void;
  isSubmitting: boolean;
}

export function BankAccountsSetupStep({
  bankName,
  setBankName,
  bankPurpose,
  setBankPurpose,
  bankBalance,
  setBankBalance,
  bankOffset,
  setBankOffset,
  addedBanks,
  addingBank,
  onAddBank,
  onBack,
  onComplete,
  isSubmitting,
}: BankAccountsSetupStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-[#1B2B4B]">Step 4: Bank Accounts & Reconciliation</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Link real bank account names and current balances so statement reconciliation automatically verifies account health.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Account Name</label>
            <input
              type="text"
              placeholder="e.g. ANZ Everyday Account"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Account Purpose</label>
            <select
              value={bankPurpose}
              onChange={(e) => setBankPurpose(e.target.value as "INCOME_LANDING" | "SAVINGS" | "EVERYDAY")}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="INCOME_LANDING">Income Landing Account</option>
              <option value="EVERYDAY">Everyday Expenses</option>
              <option value="SAVINGS">High-Interest Savings / Vault</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Current Statement Balance ($)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex items-center gap-3 pt-5">
            <input
              type="checkbox"
              id="offsetCheck"
              checked={bankOffset}
              onChange={(e) => setBankOffset(e.target.checked)}
              className="w-4 h-4 rounded text-[#00B4A6] focus:ring-[#00B4A6]"
            />
            <label htmlFor="offsetCheck" className="text-xs font-bold text-zinc-700 cursor-pointer">
              Mortgage Offset Account
            </label>
          </div>
        </div>

        <button
          onClick={onAddBank}
          disabled={addingBank || !bankName.trim()}
          className="self-end px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
        >
          {addingBank ? "Adding..." : "+ Add Bank Account"}
        </button>
      </div>

      {addedBanks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Added Bank Accounts:</span>
          <div className="flex flex-wrap gap-2">
            {addedBanks.map((b, i) => (
              <span key={i} className="px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-[#00B4A6] text-xs font-bold">
                ✓ {b}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
        >
          ← Back
        </button>

        <button
          onClick={onComplete}
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          {isSubmitting ? "Finishing Setup..." : "Complete Setup 🎉"}
        </button>
      </div>
    </div>
  );
}
