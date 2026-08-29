"use client";

import React from "react";
import { InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface PaydayDepositTabProps {
  sourceName: string;
  setSourceName: (val: string) => void;
  actualAmount: string;
  setActualAmount: (val: string) => void;
  selectedDate: string;
  setSelectedDate: (val: string) => void;
  receivingAccountId: string;
  setReceivingAccountId: (val: string) => void;
  bankAccounts: Array<{ id: string; name: string }>;
  note: string;
  setNote: (val: string) => void;
  activeEventId: string | null;
  submitting: boolean;
  onDelete: () => void;
  onSaveWithoutMarkingPaid: () => void;
}

export function PaydayDepositTab({
  sourceName,
  setSourceName,
  actualAmount,
  setActualAmount,
  selectedDate,
  setSelectedDate,
  receivingAccountId,
  setReceivingAccountId,
  bankAccounts,
  note,
  setNote,
  activeEventId,
  submitting,
  onDelete,
  onSaveWithoutMarkingPaid,
}: PaydayDepositTabProps) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-[#1B2B4B] mb-1.5 flex items-center gap-1">
            {t("payday.depositSourceName")}
            <InfoTooltip content="E.g. Primary Salary, Side Hustle, Tax Return, Client Invoice" />
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. Fortnightly Salary"
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#1B2B4B] mb-1.5 flex items-center gap-1">
            {t("payday.actualNetDeposit")}
            <InfoTooltip content="The exact take-home amount hitting your bank account today." />
          </label>
          <input
            type="number"
            step="0.01"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 text-xs font-extrabold text-[#1B2B4B] rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-[#1B2B4B] mb-1.5 flex items-center gap-1">
            {t("payday.depositReceivedDate")}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#1B2B4B] mb-1.5 flex items-center gap-1">
            {t("payday.receivingBankAccount")}
          </label>
          <select
            value={receivingAccountId}
            onChange={(e) => setReceivingAccountId(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          >
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-[#1B2B4B] mb-1.5 block">
          Deposit Note / Reference (Optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Includes quarterly performance bonus"
          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />
      </div>

      {activeEventId && (
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            🗑️ Delete Upcoming Income
          </button>
          <button
            type="button"
            onClick={onSaveWithoutMarkingPaid}
            disabled={submitting}
            className="text-xs font-bold text-[#00B4A6] hover:underline cursor-pointer"
          >
            Save details without executing payday →
          </button>
        </div>
      )}
    </div>
  );
}
