"use client";

import React, { useId, useEffect, useState } from "react";
import { InfoTooltip, useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

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
  readonly accounts: Array<{ id: string; name: string; categoryTypes?: CategoryType[]; poolTypes?: CategoryType[] }>;
  readonly isTrialExpired: boolean;
  readonly isSaving: boolean;
  readonly bankOptions: Array<{ key: BankName; label: string; logoBg: string; textColor: string }>;
  readonly onClose: () => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onCategoryTypeToggle: (type: CategoryType) => void;
  readonly fmtMoney: (val: number | string | undefined) => string;
  readonly onArchive?: () => void;
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
  onArchive,
}: BankAccountFormModalProps) {
  const toast = useToast();
  const modalId = useId();
  const bankSelectId = useId();
  const nameInputId = useId();
  const balanceInputId = useId();
  const bufferInputId = useId();
  const privateCheckId = useId();

  const [privacyWarningTarget, setPrivacyWarningTarget] = useState<boolean | null>(null);

  // Escape key handler for modal dismissal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const initialName = editingAccount?.name || "";
  const initialBankProvider = accBankProvider;
  const initialBalance = accBalance;
  const initialBuffer = accBuffer;
  const initialIsPrivate = accIsPrivate;

  const isDirty = !editingAccount ||
    accName.trim() !== initialName.trim() ||
    accBankProvider !== initialBankProvider ||
    parseFloat(accBalance || "0") !== parseFloat(initialBalance || "0") ||
    parseFloat(accBuffer || "0") !== parseFloat(initialBuffer || "0") ||
    accIsPrivate !== initialIsPrivate;

  const currentAvailable = Math.max(0, (parseFloat(accBalance) || 0) - (parseFloat(accBuffer) || 0));


  const handlePoolCheckboxClick = (typeKey: CategoryType) => {
    const isCurrentlyChecked = accSelectedTypes.includes(typeKey);
    if (isCurrentlyChecked) {
      toast.warning("Every pool must be linked to a bank account. To move this pool to a different bank account, edit the bank account that you want to link it to.");
      return;
    }
    onCategoryTypeToggle(typeKey);
  };

  const handlePrivateCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetValue = e.target.checked;
    if (targetValue !== accIsPrivate) {
      setPrivacyWarningTarget(targetValue);
    }
  };

  const handleConfirmPrivacyChange = () => {
    if (privacyWarningTarget !== null) {
      setAccIsPrivate(privacyWarningTarget);
      setPrivacyWarningTarget(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby={modalId}>
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-xl border border-zinc-100 relative"
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
              <label htmlFor={bufferInputId} className="text-xs font-bold text-zinc-700">Unbudgeted Buffer / Reserved Funds ($)</label>
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
              <InfoTooltip content="Net spendable funds in this account (Current Balance − Reserved Funds)." />
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
            <label className="text-xs font-bold text-[#1B2B4B]">Link Pools to this Account</label>
            <InfoTooltip content="Each category pool (Everyday, Bills, Goals) must be linked to a bank account for waterfall payday routing." />
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: "EVERYDAY" as const, label: "Everyday Pool" },
              { key: "REGULAR" as const, label: "Bills Pool" },
              { key: "GOAL" as const, label: "Goal Pool" },
            ].map((item) => {
              const isChecked = accSelectedTypes.includes(item.key);
              const currentOwner = accounts.find((a) => a.id !== editingAccount?.id && (a.poolTypes || a.categoryTypes || []).includes(item.key));

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
                      onChange={() => handlePoolCheckboxClick(item.key)}
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

        <div className={`flex items-center gap-2 p-3 rounded-xl border ${isTrialExpired ? 'bg-zinc-100 border-zinc-200 opacity-70' : 'bg-slate-50 border-zinc-200'}`}>
          <label htmlFor={privateCheckId} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 flex-1">
            <input
              id={privateCheckId}
              type="checkbox"
              checked={accIsPrivate}
              disabled={isTrialExpired}
              onChange={handlePrivateCheckboxChange}
              className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
            />
            <span>{t("bankAccounts.privatePersonalAccount", { defaultValue: "🔒 Private Personal Account (Hidden from other users)" })}</span>
          </label>
          {isTrialExpired && (
            <InfoTooltip content={t("bankAccounts.upgradeToPrivate", { defaultValue: "Upgrade to Premium to mark accounts as private" })} />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <div>
            {editingAccount && onArchive && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to archive "${editingAccount.name}"?`)) {
                    onArchive();
                    onClose();
                  }
                }}
                className="text-[11px] font-bold text-zinc-400 hover:text-rose-600 transition-colors"
              >
                Archive Account
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (!!editingAccount && !isDirty)}
              onClick={(e) => {
                if (editingAccount && !isDirty && !isSaving) {
                  e.preventDefault();
                  toast.info("No changes to save.");
                }
              }}
              title={editingAccount && !isDirty ? "No changes to save" : undefined}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                editingAccount && !isDirty ? "bg-zinc-300 opacity-60 cursor-not-allowed" : "bg-[#2563eb] hover:bg-blue-700"
              }`}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{editingAccount ? "Saving Account..." : "Creating Account..."}</span>
                </>
              ) : (
                <span>{editingAccount ? "Save Changes" : "Create Account"}</span>
              )}
            </button>
          </div>

        </div>

        {/* Privacy Warning Confirmation Modal */}
        {privacyWarningTarget !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-amber-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#1B2B4B]">Privacy Settings Warning</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {privacyWarningTarget
                    ? "Marking this account as Private will hide it completely from your household partner, including its name, balance, and transaction history. Are you sure?"
                    : "Making this account Shared will allow your household partner to see its name, balance, and all past transaction history. Are you sure?"}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setPrivacyWarningTarget(null)}
                  className="px-3.5 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrivacyChange}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

