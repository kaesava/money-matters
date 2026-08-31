"use client";

import React, { useId, useEffect, useState } from "react";
import { InfoTooltip, useToast, isFormDirty, ConfirmDialog } from "@money-matters/ui/web";

import { t } from "@money-matters/i18n";

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";

export interface PoolRecord {
  id: string;
  name: string;
  poolType: string;
  bankAccountId: string;
  currentBalance: number;
}

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
  readonly pools: PoolRecord[];
  readonly selectedPoolIds: string[];
  readonly onPoolToggle: (poolId: string) => void;
  readonly accounts: Array<{ id: string; name: string }>;
  readonly isTrialExpired: boolean;
  readonly isSaving: boolean;
  readonly bankOptions: Array<{ key: BankName; label: string; logoBg: string; textColor: string }>;
  readonly onClose: () => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly fmtMoney: (val: number | string | undefined) => string;
  readonly onArchive?: () => void;
  readonly errorMsg?: string | null;
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
  setAccIsPrivate: _setAccIsPrivate,
  pools,
  selectedPoolIds,
  onPoolToggle,
  accounts,
  isTrialExpired,
  isSaving,
  bankOptions,
  onClose,
  onSubmit,
  fmtMoney,
  onArchive,
  errorMsg,
}: BankAccountFormModalProps) {
  const toast = useToast();
  const modalId = useId();
  const bankSelectId = useId();
  const nameInputId = useId();
  const balanceInputId = useId();
  const bufferInputId = useId();
  const privateCheckId = useId();

  const [privacyWarningTarget, setPrivacyWarningTarget] = useState<boolean | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [poolStealTarget, setPoolStealTarget] = useState<{ pool: PoolRecord; ownerName: string } | null>(null);


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

  const initialPoolIds = editingAccount ? pools.filter(p => p.bankAccountId === editingAccount.id).map(p => p.id) : [];

  const initialState = editingAccount ? {
    name: editingAccount.name,
    bankProvider: (editingAccount as unknown as { bankProvider?: string }).bankProvider || "CBA",
    balance: (editingAccount as unknown as { lastKnownBalance?: string }).lastKnownBalance || "0",
    buffer: (editingAccount as unknown as { unbudgetedBuffer?: string }).unbudgetedBuffer || "0",
    isPrivate: Boolean((editingAccount as unknown as { isPrivate?: boolean }).isPrivate),
    selectedPoolIds: initialPoolIds,
  } : null;

  const currentState = {
    name: accName,
    bankProvider: accBankProvider,
    balance: accBalance,
    buffer: accBuffer,
    isPrivate: accIsPrivate,
    selectedPoolIds,
  };

  const isDirty = isFormDirty(initialState, currentState);

  const currentAvailable = Math.max(0, (parseFloat(accBalance) || 0) - (parseFloat(accBuffer) || 0));
  const isNegativeAvailable = (parseFloat(accBalance) || 0) < (parseFloat(accBuffer) || 0);

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

        {(errorMsg || isNegativeAvailable) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {isNegativeAvailable
              ? "Unbudgeted Buffer / Reserved amount cannot exceed the Current Balance."
              : errorMsg}
          </div>
        )}

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
            <span className={`font-mono text-sm font-black ${isNegativeAvailable ? "text-rose-600" : "text-emerald-700"}`}>
              {fmtMoney(currentAvailable)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100">
          <div className="flex items-center gap-1">
            <label className="text-xs font-bold text-[#1B2B4B]">Link Pools to this Account</label>
            <InfoTooltip content="Each pool record (Everyday, Bills, Goals) is linked to a bank account. Linked pools inherit their privacy and user access directly from this account." />
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {pools.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-2">No pools created yet.</p>
            ) : (
              pools.map((pool) => {
                const isChecked = selectedPoolIds.includes(pool.id);
                const isCurrentlyOwned = Boolean(editingAccount && pool.bankAccountId === editingAccount.id);
                const currentOwner = accounts.find((a) => a.id === pool.bankAccountId && a.id !== editingAccount?.id);
                const typeLabel = pool.poolType === "EVERYDAY" ? "Everyday" : pool.poolType === "REGULAR" ? "Bills" : "Goal";
                const badgeStyle = pool.poolType === "EVERYDAY" ? "bg-emerald-50 text-emerald-700" : pool.poolType === "REGULAR" ? "bg-blue-50 text-[#2563eb]" : "bg-indigo-50 text-indigo-700";

                const handleToggleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (isChecked && isCurrentlyOwned) {
                    toast.info("To unlink this pool, link it to your target Bank Account instead.");
                    return;
                  }
                  if (!isChecked && currentOwner) {
                    setPoolStealTarget({ pool, ownerName: currentOwner.name });
                    return;
                  }
                  onPoolToggle(pool.id);
                };

                return (
                  <div
                    key={pool.id}
                    onClick={handleToggleClick}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      isChecked ? "bg-blue-50/50 border-[#2563eb] text-[#1B2B4B]" : "bg-zinc-50/50 border-zinc-200 text-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb]"
                      />
                      <div className="flex items-center gap-2">
                        <span>{pool.name}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${badgeStyle}`}>
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {currentOwner && !isChecked ? (
                        <span className="text-[10px] font-normal text-zinc-400">Linked to: {currentOwner.name}</span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-400">Available: {fmtMoney(pool.currentBalance)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
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
            <span>{t("bankAccounts.privatePersonalAccount", { defaultValue: "Private Personal Account (Hidden from other users)" })}</span>
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
                onClick={() => setShowArchiveConfirm(true)}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 transition-colors"
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
              disabled={isSaving || isNegativeAvailable || (!!editingAccount && !isDirty)}
              onClick={(e) => {
                if (isNegativeAvailable) {
                  e.preventDefault();
                  toast.error("Unbudgeted Buffer cannot exceed Current Balance.");
                  return;
                }
                if (editingAccount && !isDirty && !isSaving) {
                  e.preventDefault();
                  toast.info("No changes to save.");
                }
              }}
              title={isNegativeAvailable ? "Reserved funds cannot exceed Current Balance" : editingAccount && !isDirty ? "No changes to save" : undefined}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                isNegativeAvailable || (editingAccount && !isDirty) ? "bg-zinc-300 opacity-60 cursor-not-allowed" : "bg-[#2563eb] hover:bg-blue-700"
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

        <ConfirmDialog
          isOpen={!!poolStealTarget}
          onClose={() => setPoolStealTarget(null)}
          onConfirm={() => {
            if (poolStealTarget) {
              onPoolToggle(poolStealTarget.pool.id);
              setPoolStealTarget(null);
            }
          }}
          title="Re-link Pool"
          description={`"_${poolStealTarget?.pool.name}_" is currently linked to **${poolStealTarget?.ownerName}**. Linking it here will move it to this account. Are you sure?`}
          confirmLabel="Link to this Account"
          variant="warning"
        />

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

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={() => {
          setShowArchiveConfirm(false);
          if (onArchive) onArchive();
          onClose();
        }}
        title="Archive Bank Account"
        description={`Are you sure you want to archive "${editingAccount?.name || ""}"?`}
        confirmLabel="Archive Account"
        variant="danger"
      />
    </div>
  );
}


