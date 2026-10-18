"use client";

import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, ConfirmDialog, InfoTooltip } from "@money-matters/ui/web";
import {
  BankProvider,
  AccountType,
  getDefaultAccountName,
} from "@money-matters/types";
import { SetupBankAccountRow, BankAccountRowItem } from "./SetupBankAccountRow";

interface SetupBankAccountsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function SetupBankAccountsStep({ onNext, onBack }: SetupBankAccountsStepProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const { data: fetchedAccounts = [] } = trpc.getBankAccountsWithMappings.useQuery();

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      toast.success(t("common.success"));
    },
    onError: (err) => {
      toast.error(err.message || t("common.error"));
    },
  });

  const updateAccountMut = trpc.updateBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || t("common.error"));
    },
  });

  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      setDeleteTargetId(null);
      toast.success(t("common.success"));
    },
    onError: (err) => {
      toast.error(err.message || t("common.error"));
    },
  });

  const handleFieldChange = (
    acc: BankAccountRowItem,
    field: "name" | "bankProvider" | "accountType" | "lastKnownBalance" | "unbudgetedBuffer" | "isPrivate",
    value: string | boolean
  ) => {
    let nextName = acc.name;
    const currentProvider = (acc.bankProvider || "Other") as BankProvider;
    const currentType = ((acc.accountType as AccountType) || "EVERYDAY") as AccountType;
    const oldDefaultName = getDefaultAccountName(currentProvider, currentType);
    const isUntouched = !acc.name.trim() || acc.name.trim() === oldDefaultName;

    if (field === "bankProvider") {
      const nextProvider = value as BankProvider;
      if (isUntouched) {
        nextName = getDefaultAccountName(nextProvider, currentType);
      }
    } else if (field === "accountType") {
      const nextType = value as AccountType;
      if (isUntouched) {
        nextName = getDefaultAccountName(currentProvider, nextType);
      }
    } else if (field === "name") {
      nextName = value as string;
    }

    updateAccountMut.mutate({
      accountId: acc.id,
      data: {
        name: nextName,
        bankProvider: field === "bankProvider" ? (value as BankProvider) : currentProvider,
        accountType: field === "accountType" ? (value as AccountType) : currentType,
        lastKnownBalance: field === "lastKnownBalance" ? String(value) : String(acc.lastKnownBalance || "0.00"),
        unbudgetedBuffer: field === "unbudgetedBuffer" ? String(value) : String(acc.unbudgetedBuffer || "0.00"),
        isPrivate: field === "isPrivate" ? Boolean(value) : Boolean(acc.isPrivate),
      },
    });
  };

  const handleAddAccount = () => {
    createAccountMut.mutate({
      name: "",
      bankProvider: "Other",
      accountType: "EVERYDAY",
      lastKnownBalance: "1000.00",
      unbudgetedBuffer: "0.00",
      isPrivate: false,
    });
  };

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
            <span>💡</span>
            <span>{t("setup.bankAccountsStep.tipTitle")}</span>
          </h3>
          <InfoTooltip content={t("setup.bankAccountsStep.envelopesExplainerTooltip")} />
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("setup.bankAccountsStep.tipContent")}
        </p>
      </div>

      {/* Inline Editable Accounts List */}
      <div className="flex flex-col gap-4">
        {fetchedAccounts.map((acc, index) => (
          <SetupBankAccountRow
            key={acc.id}
            acc={acc as BankAccountRowItem}
            index={index}
            totalCount={fetchedAccounts.length}
            onRemove={(id) => setDeleteTargetId(id)}
            onFieldChange={handleFieldChange}
          />
        ))}

        {/* Add Bank Account CTA */}
        <button
          type="button"
          onClick={handleAddAccount}
          disabled={createAccountMut.isPending}
          className="py-2.5 px-4 bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          onClick={onNext}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>{t("setup.bankAccountsStep.nextGoals")}</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) archiveAccountMut.mutate({ accountId: deleteTargetId });
        }}
        title={t("settings.bankAccountForm.archiveConfirmTitle")}
        description={t("settings.bankAccountForm.archiveConfirmBody", { name: "account" })}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
}
