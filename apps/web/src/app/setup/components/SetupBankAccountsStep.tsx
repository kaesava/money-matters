"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { ConfirmDialog, InfoTooltip, FormErrorBanner } from "@money-matters/ui/web";
import { computeAccountAvailability } from "@money-matters/types";
import { SetupBankAccountRow, BankAccountRowItem } from "./SetupBankAccountRow";

interface SetupBankAccountsStepProps {
  accounts: BankAccountRowItem[];
  onAddAccount: () => void;
  onUpdateAccount: (
    acc: BankAccountRowItem,
    field: "name" | "bankProvider" | "accountType" | "lastKnownBalance" | "unbudgetedBuffer" | "isPrivate",
    value: string | boolean
  ) => void;
  onRemoveAccount: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps?: number;
}

export function SetupBankAccountsStep({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onNext,
  onBack,
  totalSteps: _totalSteps = 4,
}: SetupBankAccountsStepProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleFieldChange = (
    acc: BankAccountRowItem,
    field: "name" | "bankProvider" | "accountType" | "lastKnownBalance" | "unbudgetedBuffer" | "isPrivate",
    value: string | boolean
  ) => {
    onUpdateAccount(acc, field, value);
  };

  const handleAddAccount = () => {
    onAddAccount();
  };

  const hasNegativeAvailable = accounts.some(
    (acc) => computeAccountAvailability(String(acc.lastKnownBalance || "0.00"), String(acc.unbudgetedBuffer || "0.00")).available < 0
  );
  const hasSharedAccount = accounts.some((acc) => !acc.isPrivate);
  const canProceed = !hasNegativeAvailable && hasSharedAccount;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-black text-[#1B2B4B] tracking-tight">
            {t("setup.bankAccountsStep.title")}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t("setup.bankAccountsStep.subtitle")}
          </p>
        </div>
      </div>

      {/* Serene Finance Tip Card */}
      <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col gap-1.5 shadow-xs">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-black text-[#2563eb] flex items-center gap-1">
            <span>{t("setup.bankAccountsStep.tipTitle")}</span>
          </h3>
          <InfoTooltip content={t("setup.bankAccountsStep.envelopesExplainerTooltip")} />
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("setup.bankAccountsStep.tipContent")}
        </p>
      </div>

      {/* Error Banners if Validation Fails */}
      {hasNegativeAvailable && (
        <FormErrorBanner message={t("setup.bankAccountsStep.negativeAvailableError")} />
      )}
      {!hasNegativeAvailable && !hasSharedAccount && (
        <FormErrorBanner message={t("setup.bankAccountsStep.noSharedAccountError")} />
      )}

      {/* Inline Editable Accounts List */}
      <div className="flex flex-col gap-4">
        {accounts.map((acc, index) => (
          <SetupBankAccountRow
            key={acc.id}
            acc={acc}
            index={index}
            totalCount={accounts.length}
            onRemove={(id) => setDeleteTargetId(id)}
            onFieldChange={handleFieldChange}
          />
        ))}

        {/* Add Bank Account CTA */}
        <button
          type="button"
          onClick={handleAddAccount}
          className="py-2.5 px-4 bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          + {t("setup.bankAccountsStep.addAccount")}
        </button>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
        >
          {t("setup.bankAccountsStep.backIncome")}
        </button>

        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>{t("setup.bankAccountsStep.nextGoals")}</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            onRemoveAccount(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t("settings.bankAccountForm.archiveConfirmTitle")}
        description={t("settings.bankAccountForm.archiveConfirmBody", { name: "account" })}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
}
