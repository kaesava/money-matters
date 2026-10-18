"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip, AmountField } from "@money-matters/ui/web";
import {
  BANK_PROVIDERS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  BANK_PROVIDER_LABELS,
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

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#1B2B4B]">
          {t("setup.bankAccountsStep.accountNumber", { number: index + 1 })}
        </span>
        {totalCount > 1 && (
          <button
            type="button"
            onClick={() => onRemove(acc.id)}
            className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
          >
            {t("common.remove")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        {/* Institution Dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">
            {t("settings.bankAccountForm.bankProviderLabel")}
          </label>
          <select
            value={acc.bankProvider || "Other"}
            onChange={(e) => onFieldChange(acc, "bankProvider", e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:ring-2 focus:ring-[#2563eb]"
          >
            {BANK_PROVIDERS.map((bp) => (
              <option key={bp} value={bp}>
                {BANK_PROVIDER_LABELS[bp]}
              </option>
            ))}
          </select>
        </div>

        {/* Account Type Dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-zinc-500">
            {t("settings.bankAccountForm.accountTypeLabel")}
          </label>
          <select
            value={acc.accountType || "EVERYDAY"}
            onChange={(e) => onFieldChange(acc, "accountType", e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:ring-2 focus:ring-[#2563eb]"
          >
            {ACCOUNT_TYPES.map((at) => (
              <option key={at} value={at}>
                {ACCOUNT_TYPE_LABELS[at]}
              </option>
            ))}
          </select>
        </div>

        {/* Account Name */}
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

        {/* Balance */}
        <AmountField
          label={t("settings.bankAccountForm.balanceLabel")}
          value={String(acc.lastKnownBalance || "0.00")}
          onChange={(val) => onFieldChange(acc, "lastKnownBalance", val)}
          allowNegative={false}
        />

        {/* Buffer */}
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

        {/* Available to Budget & Private */}
        <div className="flex flex-col justify-end gap-1.5">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs font-bold">
            <span className="text-[11px] text-zinc-600 font-semibold">{t("bankAccounts.availableLabel")}:</span>
            <span className={`font-mono text-xs font-black ${isBufferInvalid ? "text-rose-600" : "text-emerald-700"}`}>
              ${available.toFixed(2)}
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={Boolean(acc.isPrivate)}
              onChange={(e) => onFieldChange(acc, "isPrivate", e.target.checked)}
              className="w-3.5 h-3.5 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb]"
            />
            <span>{t("settings.bankAccountForm.privacyLabel")}</span>
            <InfoTooltip content={t("settings.bankAccountForm.privacyHint")} />
          </label>
        </div>
      </div>
    </div>
  );
}
