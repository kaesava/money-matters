"use client";

import React, { useId, useState } from "react";
import { InfoTooltip, isFormDirty, ConfirmDialog, Button, Input, AmountField, ModalDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";
import { computeAccountAvailability } from "@money-matters/types";

type BankName = "CBA" | "Westpac" | "ANZ" | "NAB" | "ING" | "Macquarie" | "Other";

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
  readonly isTrialExpired: boolean;
  readonly isSaving: boolean;
  readonly bankOptions: Array<{ key: BankName; label: string; logoBg: string; textColor: string }>;
  readonly onClose: () => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly fmtMoney: (val: number | string | undefined) => string;
  readonly onArchive?: () => void;
  readonly errorMsg?: string | null;
  // Optional legacy props to maintain non-breaking compatibility
  readonly pools?: unknown[];
  readonly selectedPoolIds?: string[];
  readonly onPoolToggle?: (poolId: string) => void;
  readonly accounts?: Array<{ id: string; name: string }>;
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
  isTrialExpired,
  isSaving,
  bankOptions,
  onClose,
  onSubmit,
  fmtMoney,
  onArchive,
  errorMsg,
}: BankAccountFormModalProps) {
  const { currency, currencySymbol, minorUnits } = useLocale();
  const privateCheckId = useId();

  const [privacyWarningTarget, setPrivacyWarningTarget] = useState<boolean | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const initialState = editingAccount ? {
    name: editingAccount.name,
    bankProvider: (editingAccount as unknown as { bankProvider?: string }).bankProvider || "CBA",
    balance: (editingAccount as unknown as { lastKnownBalance?: string }).lastKnownBalance || "0",
    buffer: (editingAccount as unknown as { unbudgetedBuffer?: string }).unbudgetedBuffer || "0",
    isPrivate: Boolean((editingAccount as unknown as { isPrivate?: boolean }).isPrivate),
  } : null;

  const currentState = {
    name: accName,
    bankProvider: accBankProvider,
    balance: accBalance,
    buffer: accBuffer,
    isPrivate: accIsPrivate,
  };

  const isDirty = isFormDirty(initialState, currentState);
  const { actualBalance, buffer, available } = computeAccountAvailability(accBalance, accBuffer);
  const isBufferInvalid = buffer > actualBalance;

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
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={editingAccount ? t("settings.bankAccountForm.editTitle") : t("settings.bankAccountForm.addTitle")}
      maxWidth="max-w-lg"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {(errorMsg || isBufferInvalid) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {isBufferInvalid
              ? t("settings.bankAccountForm.bufferExceedsBalance")
              : errorMsg}
          </div>
        )}

        {/* Bank Institution Chips (Required) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-zinc-700">
            {t("settings.bankAccountForm.bankProviderLabel")} <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {bankOptions.map((b) => {
              const isSelected = accBankProvider === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setAccBankProvider(b.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label={t("settings.bankAccountForm.accountNameLabel")}
          type="text"
          value={accName}
          onChange={(e) => setAccName(e.target.value)}
          placeholder={t("settings.bankAccountForm.accountNamePlaceholder")}
          required
          autoFocus
        />

        <div className="flex flex-col gap-3 p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80">
          <AmountField
            label={`${t("settings.bankAccountForm.balanceLabel")} (${currencySymbol})`}
            value={accBalance}
            onChange={setAccBalance}
            required
            allowNegative={false}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
          />

          <AmountField
            label={`${t("settings.bankAccountForm.bufferLabel")} (${currencySymbol})`}
            value={accBuffer}
            onChange={setAccBuffer}
            placeholder="0.00"
            allowNegative={false}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
          />

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs font-bold">
            <div className="flex items-center gap-1">
              <span className="text-[#1B2B4B]">{t("settings.bankAccountForm.availableLabel")}</span>
              <InfoTooltip content={t("settings.bankAccountForm.availableTooltip")} />
            </div>
            <span className={`font-mono text-sm font-black ${isBufferInvalid ? "text-rose-600" : "text-emerald-700"}`}>
              {fmtMoney(available)}
            </span>
          </div>
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-xl border ${Boolean(editingAccount) || isTrialExpired ? "bg-zinc-100 border-zinc-200 opacity-70" : "bg-slate-50 border-zinc-200"}`}>
          <label htmlFor={privateCheckId} className={`flex items-center gap-2 text-xs font-bold text-zinc-700 flex-1 ${Boolean(editingAccount) ? "cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              id={privateCheckId}
              type="checkbox"
              checked={accIsPrivate}
              disabled={Boolean(editingAccount) || isTrialExpired}
              onChange={handlePrivateCheckboxChange}
              className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
            />
            <span>{t("settings.bankAccountForm.privacyLabel")}</span>
          </label>
          <InfoTooltip content={t("settings.bankAccountForm.privacyHint")} />
          {Boolean(editingAccount) ? (
            <InfoTooltip content={t("settings.bankAccountForm.privacyLockedTooltip")} />
          ) : isTrialExpired ? (
            <InfoTooltip content={t("settings.bankAccountForm.privacyUpgradeTooltip")} />
          ) : null}
        </div>

        {/* Informative note about linking pools */}
        <p className="text-[11px] text-zinc-500 italic">
          {t("settings.bankAccountForm.linkPoolNote")}
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <div>
            {editingAccount && onArchive && (
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 transition-colors cursor-pointer"
              >
                {t("settings.bankAccountForm.archiveAccountCta")}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <Button
              type="submit"
              loading={isSaving}
              disabled={!accName.trim() || isBufferInvalid || !isDirty}
              title={isBufferInvalid ? t("settings.bankAccountForm.bufferExceedsBalance") : !isDirty ? t("modals.discardChanges.noChanges") : undefined}
            >
              {editingAccount ? t("settings.bankAccountForm.saveCta") : t("settings.bankAccountForm.createCta")}
            </Button>
          </div>
        </div>

        <ConfirmDialog
          isOpen={privacyWarningTarget !== null}
          onClose={() => setPrivacyWarningTarget(null)}
          onConfirm={handleConfirmPrivacyChange}
          title={t("settings.bankAccountForm.privacyConfirmTitle")}
          description={t("settings.bankAccountForm.privacyConfirmBody")}
          confirmLabel={t("common.confirm")}
          variant="warning"
        />

        <ConfirmDialog
          isOpen={showArchiveConfirm}
          onClose={() => setShowArchiveConfirm(false)}
          onConfirm={() => {
            setShowArchiveConfirm(false);
            if (onArchive) onArchive();
            onClose();
          }}
          title={t("settings.bankAccountForm.archiveConfirmTitle")}
          description={t("settings.bankAccountForm.archiveConfirmBody", { name: editingAccount?.name || "" })}
          confirmLabel={t("settings.bankAccountForm.archiveAccountCta")}
          variant="danger"
        />
      </form>
    </ModalDialog>
  );
}
