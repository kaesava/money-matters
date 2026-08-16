"use client";

import React, { useId } from "react";
import { InfoTooltip } from "@money-matters/ui/web";

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";
type CategoryType = "EVERYDAY" | "REGULAR" | "GOAL";

export interface BankAccountFormModalProps {
  readonly isOpen: boolean;
  readonly editingAccount: { id: string; name: string } | null;
  readonly accName: string;
  readonly setAccName: (val: string) => void;
  readonly accBankProvider: BankName;
  readonly setAccBankProvider: (val: BankName) => void;
  readonly accBalance: string;
  readonly setAccBalance: (val: string) => void;
  readonly accBuffer: string;
  readonly setAccBuffer: (val: string) => void;
  readonly accIsPrivate: boolean;
  readonly setAccIsPrivate: (val: boolean) => void;
  readonly accSelectedTypes: CategoryType[];
  readonly accounts: Array<{ id: string; name: string; categoryTypes: CategoryType[] }>;
  readonly isTrialExpired: boolean;
  readonly isSaving: boolean;
  readonly bankOptions: Array<{ key: BankName; label: string; logoBg: string; textColor: string }>;
  readonly onClose: () => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onCategoryTypeToggle: (type: CategoryType) => void;
  readonly fmtMoney: (val: number | string | undefined) => string;
}

export function BankAccountFormModal({
  isOpen,
  editingAccount,
  accName,
  setAccName,
  accBankProvider,
  setAccBankProvider,
  accBalance,
  setAccBalance,
  accBuffer,
  setAccBuffer,
  accIsPrivate,
  setAccIsPrivate,
  accSelectedTypes,
  accounts,
  isTrialExpired,
  isSaving,
  bankOptions,
  onClose,
  onSubmit,
  onCategoryTypeToggle,
  fmtMoney,
}: BankAccountFormModalProps) {
  const modalId = useId();
  const bankSelectId = useId();
  const nameInputId = useId();
  const balanceInputId = useId();
  const bufferInputId = useId();
  const privateCheckId = useId();

  if (!isOpen) return null;

  const currentAvailable = Math.max(0, (parseFloat(accBalance) || 0) - (parseFloat(accBuffer) || 0));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby={modalId}>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-xl border border-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 id={modalId} className="text-base font-bold text-[#1B2B4B]">
            {editingAccount ? "Edit Bank Account" : "Add New Bank Account"}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close modal" className="text-zinc-400 hover:text-zinc-600 font-bold">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <label htmlFor={bankSelectId} className="text-xs font-bold text-zinc-700">Bank Institution</label>
            <InfoTooltip content="Select the Australian bank or financial institution for this account." />
          </div>
          <select
            id={bankSelectId}
            value={accBankProvider}
            onChange={(e) => setAccBankProvider(e.target.value as BankName)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
          >
            {bankOptions.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={nameInputId} className="text-xs font-bold text-zinc-700">Account Name</label>
          <input
            id={nameInputId}
            type="text"
            value={accName}
            onChange={(e) => setAccName(e.target.value)}
            placeholder="e.g. Smart Access Savings"
            className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            required
          />
        </div>

        <div className="flex flex-col gap-3 p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <label htmlFor={balanceInputId} className="text-xs font-bold text-zinc-700">Current Balance ($)</label>
              <InfoTooltip content="Total actual funds currently in this bank account." />
            </div>
            <input
              id={balanceInputId}
              type="number"
              step="0.01"
              value={accBalance}
              onChange={(e) => setAccBalance(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <label htmlFor={bufferInputId} className="text-xs font-bold text-zinc-700">Unbudgeted Buffer / Earmarked Funds ($)</label>
              <InfoTooltip content="Funds held in this account that are reserved/earmarked and excluded from your budget (e.g. kids' offset savings, emergency buffer)." />
            </div>
            <input
              id={bufferInputId}
              type="number"
              step="0.01"
              value={accBuffer}
              onChange={(e) => setAccBuffer(e.target.value)}
              placeholder="0.00"
              className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs font-bold">
            <div className="flex items-center gap-1">
              <span className="text-[#1B2B4B]">Amount Available to Budget:</span>
              <InfoTooltip content="Net spendable funds in this account (Current Balance − Earmarked Funds)." />
            </div>
            <span className={`font-mono text-sm font-black ${
              (parseFloat(accBalance) || 0) - (parseFloat(accBuffer) || 0) < 0
                ? "text-rose-600"
                : "text-emerald-700"
            }`}>
              {fmtMoney(currentAvailable)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100">
          <div className="flex items-center gap-1">
            <label className="text-xs font-bold text-[#1B2B4B]">Link Category Types to this Account</label>
            <InfoTooltip content="Each category pool (Everyday, Bills, Savings) can only be linked to a single bank account for waterfall payday routing." />
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: "EVERYDAY" as const, label: "Everyday Pool" },
              { key: "REGULAR" as const, label: "Bills Pool" },
              { key: "GOAL" as const, label: "Goal Pool" },
            ].map((item) => {
              const isChecked = accSelectedTypes.includes(item.key);
              const currentOwner = accounts.find((a) => a.id !== editingAccount?.id && a.categoryTypes.includes(item.key));

              return (
                <label
                  key={item.key}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isChecked ? "bg-blue-50/50 border-[#2563eb] text-[#1B2B4B]" : "bg-zinc-50/50 border-zinc-200 text-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onCategoryTypeToggle(item.key)}
                      className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb]"
                    />
                    <span>{item.label}</span>
                  </div>
                  {currentOwner && !isChecked && (
                    <span className="text-[10px] font-normal text-zinc-400">Currently linked: {currentOwner.name}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <label htmlFor={privateCheckId} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 bg-slate-50 p-3 rounded-xl border border-zinc-200">
          <input
            id={privateCheckId}
            type="checkbox"
            checked={accIsPrivate}
            disabled={isTrialExpired}
            onChange={(e) => setAccIsPrivate(e.target.checked)}
            className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb]"
          />
          <span>🔒 Private Personal Account {isTrialExpired ? "(Trial Expired)" : "(Hidden from other users)"}</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            {isSaving ? "Saving..." : editingAccount ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
