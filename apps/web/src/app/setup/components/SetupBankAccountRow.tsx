"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip, AmountField } from "@money-matters/ui/web";
import {
  BANK_PROVIDERS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  BANK_PROVIDER_LABELS,
  BankProvider,
  AccountType,
  getDefaultAccountName,
  computeAccountAvailability,
} from "@money-matters/types";

export interface BankAccountRowItem {
  id: string;
  name: string;
  bankProvider: string;
  accountType?: string | null;
  lastKnownBalance: string;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean | null;
}

interface SetupBankAccountRowProps {
  acc: BankAccountRowItem;
  index: number;
  totalCount: number;
  onRemove: (id: string) => void;
  onFieldChange: (
    acc: BankAccountRowItem,
    field: "name" | "bankProvider" | "accountType" | "lastKnownBalance" | "unbudgetedBuffer" | "isPrivate",
    value: string | boolean
  ) => void;
}

export function SetupBankAccountRow({
  acc,
  index,
  totalCount,
  onRemove,
  onFieldChange,
}: SetupBankAccountRowProps) {
  const { actualBalance, buffer, available } = computeAccountAvailability(
    String(acc.lastKnownBalance || "0.00"),
    String(acc.unbudgetedBuffer || "0.00")
  );
  const isBufferInvalid = buffer > actualBalance;
  const isSoleAccount = totalCount <= 1;

  const handleProviderChange = (newProvider: BankProvider) => {
    onFieldChange(acc, "bankProvider", newProvider);
    const newName = getDefaultAccountName(newProvider, (acc.accountType as AccountType) || "EVERYDAY");
    onFieldChange(acc, "name", newName);
  };

  const handleTypeChange = (newType: AccountType) => {
    onFieldChange(acc, "accountType", newType);
    const newName = getDefaultAccountName((acc.bankProvider as BankProvider) || "Other", newType);
    onFieldChange(acc, "name", newName);
  };

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 flex flex-col gap-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#1B2B4B]">
          {t("setup.bankAccountsStep.accountNumber", { number: index + 1 })}
        </span>
        {!isSoleAccount && (
          <button
            type="button"
            onClick={() => onRemove(acc.id)}
            className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
          >
            {t("common.remove")}
          </button>
        )}
      </div>

      {/* Line 1: Institution, Account Type, Account Name */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">
            {t("settings.bankAccountForm.bankProviderLabel")}
          </label>
          <select
            value={acc.bankProvider || "Other"}
            onChange={(e) => handleProviderChange(e.target.value as BankProvider)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:ring-2 focus:ring-[#2563eb]"
          >
            {BANK_PROVIDERS.map((bp) => (
              <option key={bp} value={bp}>
                {BANK_PROVIDER_LABELS[bp]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">
            {t("settings.bankAccountForm.accountTypeLabel")}
          </label>
          <select
            value={acc.accountType || "EVERYDAY"}
            onChange={(e) => handleTypeChange(e.target.value as AccountType)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:ring-2 focus:ring-[#2563eb]"
          >
            {ACCOUNT_TYPES.map((at) => (
              <option key={at} value={at}>
                {ACCOUNT_TYPE_LABELS[at]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">
            {t("settings.bankAccountForm.accountNameLabel")}
          </label>
          <input
            type="text"
            value={acc.name}
            placeholder="e.g. ANZ Bank (Savings)"
            onChange={(e) => onFieldChange(acc, "name", e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
      </div>

      {/* Line 2: Balance, Buffer, Available & Private */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <AmountField
          label={t("settings.bankAccountForm.balanceLabel")}
          value={String(acc.lastKnownBalance || "0.00")}
          onChange={(val) => onFieldChange(acc, "lastKnownBalance", val)}
          allowNegative={false}
        />

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <label className="text-[11px] font-bold text-zinc-500">
              {t("settings.bankAccountForm.bufferLabel")}
            </label>
            <InfoTooltip content={t("setup.bankAccountsStep.reservedFundsTooltip")} />
          </div>
          <AmountField
            value={String(acc.unbudgetedBuffer || "0.00")}
            onChange={(val) => onFieldChange(acc, "unbudgetedBuffer", val)}
            allowNegative={false}
          />
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs font-bold">
            <span className="text-[11px] text-zinc-600 font-semibold">{t("bankAccounts.availableLabel")}:</span>
            <span className={`font-mono text-xs font-black ${isBufferInvalid ? "text-rose-600" : "text-emerald-700"}`}>
              ${available.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <label
              className={`flex items-center gap-1.5 text-[11px] font-bold ${
                isSoleAccount ? "text-zinc-400 cursor-not-allowed" : "text-zinc-700 cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(acc.isPrivate) && !isSoleAccount}
                disabled={isSoleAccount}
                onChange={(e) => onFieldChange(acc, "isPrivate", e.target.checked)}
                className="w-3.5 h-3.5 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] disabled:opacity-50"
              />
              <span>{t("settings.bankAccountForm.privacyLabel")}</span>
            </label>
            <InfoTooltip
              content={
                isSoleAccount
                  ? t("setup.bankAccountsStep.singleAccountPrivateDisabledTooltip")
                  : t("settings.bankAccountForm.privacyHint")
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
