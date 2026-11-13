"use client";

import React, { useState, useEffect, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { Button, AmountField, DatePickerField, ModalDialog } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import { MarkPaidShortfallSection } from "./MarkPaidShortfallSection";

export interface CategoryOption {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "BILL" | "GOAL" | string;
  currentBalance: number | string;
  isSurplusTarget?: boolean;
}

export interface ShortfallTransferItem {
  poolId: string;
  amount: string;
}

export interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  billName: string;
  poolId?: string;
  poolName?: string;
  poolType?: string;
  initialAmount: number | string;
  initialDate: string;
  availableCategories: CategoryOption[];
  onConfirmMarkPaid: (params: {
    amount: number;
    date: string;
    transfers?: ShortfallTransferItem[];
  }) => Promise<void>;
  onOpenTransferModal?: () => void;
}

export function MarkPaidModal({
  isOpen,
  onClose,
  billName,
  poolId,
  poolName,
  poolType,
  initialAmount,
  initialDate,
  availableCategories,
  onConfirmMarkPaid,
  onOpenTransferModal,
}: MarkPaidModalProps) {
  const { fmt, fmtDate, currency, currencySymbol, minorUnits, timezone: contextTz, userTimezone } = useLocale();
  const [amountStr, setAmountStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [wasFutureDate, setWasFutureDate] = useState(false);
  const [originalDate, setOriginalDate] = useState("");
  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone || contextTz }).format(new Date());
  }, [userTimezone, contextTz]);

  useEffect(() => {
    if (isOpen) {
      const amt = typeof initialAmount === "number" ? initialAmount.toFixed(2) : String(initialAmount || "0.00");
      setAmountStr(amt);
      const isFuture = Boolean(initialDate && initialDate > todayStr);
      setWasFutureDate(isFuture);
      setOriginalDate(initialDate || "");
      const chosenDate = isFuture ? todayStr : initialDate || todayStr;
      setDateStr(chosenDate);
    }
  }, [isOpen, initialAmount, initialDate, todayStr]);

  const numAmount = useMemo(() => {
    const parsed = parseFloat(amountStr);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountStr]);

  // Find target pool balance
  const targetPool = useMemo(() => {
    if (!poolId) return null;
    return availableCategories.find((c) => c.id === poolId) || null;
  }, [availableCategories, poolId]);

  const targetBalance = useMemo(() => {
    if (!targetPool) return 0;
    const bal = typeof targetPool.currentBalance === "string" ? parseFloat(targetPool.currentBalance || "0") : (targetPool.currentBalance ?? 0);
    return isNaN(bal) ? 0 : bal;
  }, [targetPool]);

  const formattedPoolName = targetPool?.name || poolName || "Envelope";
  const formattedPoolType = targetPool?.poolType || poolType || "Bills";

  const shortfallAmount = useMemo(() => {
    return Math.max(0, numAmount - targetBalance);
  }, [numAmount, targetBalance]);

  const hasShortfall = shortfallAmount > 0.001;

  // Filter out pools with balance <= 0 AND exclude the pool being paid (self)
  const validCategories = useMemo(() => {
    return availableCategories.filter((c) => {
      if (poolId && c.id === poolId) return false; // Exclude self!
      const bal = typeof c.currentBalance === "string" ? parseFloat(c.currentBalance || "0") : (c.currentBalance ?? 0);
      return bal > 0;
    });
  }, [availableCategories, poolId]);

  // Identify surplus target pool
  const surplusCategory = useMemo(() => {
    return validCategories.find((c) => c.isSurplusTarget) || validCategories[0];
  }, [validCategories]);

  // Initialize transfer amounts when shortfall changes
  useEffect(() => {
    if (!isOpen || !hasShortfall) {
      setTransferAmounts({});
      return;
    }

    const initialAmounts: Record<string, string> = {};
    if (surplusCategory) {
      const surplusBal = typeof surplusCategory.currentBalance === "string"
        ? parseFloat(surplusCategory.currentBalance || "0")
        : (surplusCategory.currentBalance ?? 0);
      const prefill = Math.min(shortfallAmount, surplusBal);
      if (prefill > 0) {
        initialAmounts[surplusCategory.id] = prefill.toFixed(2);
      }
    }
    setTransferAmounts(initialAmounts);
  }, [isOpen, hasShortfall, shortfallAmount, surplusCategory]);

  const handleAmountChange = (pId: string, maxBal: number, rawVal: string) => {
    if (rawVal === "") {
      setTransferAmounts((prev) => ({ ...prev, [pId]: "" }));
      return;
    }
    if (rawVal.startsWith("-")) return;
    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      setTransferAmounts((prev) => ({ ...prev, [pId]: "0.00" }));
      return;
    }
    const capped = Math.min(parsed, maxBal);
    setTransferAmounts((prev) => ({ ...prev, [pId]: capped.toString() }));
  };

  const totalAllocated = useMemo(() => {
    return Object.values(transferAmounts).reduce((sum, valStr) => {
      const num = parseFloat(valStr || "0");
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [transferAmounts]);

  const remainingShortfall = shortfallAmount - totalAllocated;
  const isOverAllocated = remainingShortfall < -0.005;
  const isFulfilled = Math.abs(remainingShortfall) <= 0.005;
  const overAllocatedAmount = Math.max(0, totalAllocated - shortfallAmount);

  const isDateValid = Boolean(dateStr && dateStr <= todayStr);
  const isAmountValid = numAmount > 0;
  const isValid = isAmountValid && isDateValid && isFulfilled;

  const isDirty = useMemo(() => {
    const initAmt = typeof initialAmount === "number" ? initialAmount.toFixed(2) : String(initialAmount || "0.00");
    const initDate = wasFutureDate ? todayStr : initialDate || todayStr;
    const hasAmountChanged = amountStr !== initAmt;
    const hasDateChanged = dateStr !== initDate;
    const hasTransfers = Object.values(transferAmounts).some((v) => parseFloat(v || "0") > 0);
    return hasAmountChanged || hasDateChanged || hasTransfers;
  }, [amountStr, dateStr, initialAmount, initialDate, wasFutureDate, todayStr, transferAmounts]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    const transfers: ShortfallTransferItem[] = hasShortfall
      ? Object.entries(transferAmounts)
          .map(([pId, amountStr]) => ({
            poolId: pId,
            amount: parseFloat(amountStr || "0").toFixed(2),
          }))
          .filter((item) => parseFloat(item.amount) > 0)
      : [];

    try {
      await onConfirmMarkPaid({
        amount: numAmount,
        date: dateStr,
        transfers,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={t("incomeBillsTabs.markSpentModalTitle")}
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {/* {t("categories.targetPool")} & {t("tables.currentBalance")} Header Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              {t("categories.targetPool")}
            </span>
            <span className="font-bold text-sm text-[#1B2B4B] dark:text-white">
              {formattedPoolName} <span className="text-xs font-normal text-zinc-500">({formattedPoolType})</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              {t("tables.currentBalance")}
            </span>
            <span className="font-mono font-bold text-sm text-[#2563eb] tabular-nums">
              {fmt(targetBalance)}
            </span>
          </div>
        </div>

        {/* Editable Amount & Date Inputs */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <AmountField
            label={t("common.amount")}
            required
            autoFocus={true}
            value={amountStr}
            onChange={setAmountStr}
            allowNegative={false}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
            error={!isAmountValid && Boolean(amountStr) ? t("incomeBillsTabs.amountGreaterThanZero") : undefined}
          />
          <DatePickerField
            label={t("common.date")}
            required
            max={todayStr}
            value={dateStr}
            onChange={setDateStr}
          />
        </div>

        {wasFutureDate && (
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <span className="text-sm">ℹ️</span>
            <span>
              {t("incomeBillsTabs.expenseFutureDateAdjustedNotice", {
                date: fmtDate(originalDate),
              })}
            </span>
          </div>
        )}

        {hasShortfall ? (
          <MarkPaidShortfallSection
            billName={billName}
            formattedPoolName={formattedPoolName}
            shortfallAmount={shortfallAmount}
            isFulfilled={isFulfilled}
            fundingPools={validCategories}
            transferAmounts={transferAmounts}
            handleTransferChange={(pId, v) => handleAmountChange(pId, 999999999, v)}
            handleFillMax={(pId, maxBal) => {
              const rem = Math.max(0, shortfallAmount - totalAllocated + parseFloat(transferAmounts[pId] || "0"));
              const toFill = Math.min(rem, maxBal);
              handleAmountChange(pId, maxBal, toFill.toFixed(2));
            }}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
            fmt={fmt}
            totalAllocated={totalAllocated}
            remainingShortfall={remainingShortfall}
            isOverAllocated={isOverAllocated}
            overAllocatedAmount={overAllocatedAmount}
            onOpenTransferModal={onOpenTransferModal}
          />
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {t("incomeBillsTabs.sufficientBalanceNotice", {
                envelopeName: formattedPoolName,
                balance: fmt(targetBalance),
              })}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
            onClick={handleConfirm}
          >
            {hasShortfall
              ? t("incomeBillsTabs.confirmTransferAndSpend")
              : t("common.markSpent")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
