"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import { t } from "@money-matters/i18n";
import { ModalDialog } from "./ModalDialog";
import { ConfirmDialog, Button, AmountField, DatePickerField } from "@money-matters/ui/web";
import { useLocale } from "../../providers/LocaleProvider";

export interface TransferModalItem {
  readonly id: string;
  readonly name: string;
  readonly expectedAmount: string | number;
  readonly expectedDate: string; // YYYY-MM-DD
  readonly sourcePoolId?: string | null;
  readonly sourcePoolName?: string | null;
  readonly destinationPoolId?: string | null;
  readonly destinationPoolName?: string | null;
}

export interface PoolOption {
  readonly id: string;
  readonly name: string;
  readonly currentBalance?: string | number;
}

export interface TransferModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly transfer: TransferModalItem | null;
  readonly pools: readonly PoolOption[];
  readonly onSaveDraft: (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
  }) => Promise<void>;
  readonly onConfirmTransfer: (params: {
    eventId: string;
    name: string;
    amount: string;
    sourcePoolId?: string;
    destinationPoolId?: string;
  }) => Promise<void>;
  readonly onDeleteTransfer: (eventId: string) => Promise<void>;
  readonly formatAUD?: (val: number | string) => string;
}

export function TransferModal({
  isOpen,
  onClose,
  transfer,
  pools,
  onSaveDraft,
  onConfirmTransfer,
  onDeleteTransfer,
  formatAUD,
}: TransferModalProps) {
  const { fmt, currency, currencySymbol, minorUnits, timezone: contextTz } = useLocale();
  const format = formatAUD ?? fmt;
  const nameInputId = useId();

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: contextTz || "Australia/Sydney" }).format(new Date());
  }, [contextTz]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [wasPastDate, setWasPastDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && transfer) {
      setName(transfer.name || "");
      const amt = typeof transfer.expectedAmount === "number"
        ? transfer.expectedAmount.toFixed(2)
        : parseFloat(transfer.expectedAmount || "0").toFixed(2);
      setAmount(amt);

      const isPast = Boolean(transfer.expectedDate && transfer.expectedDate < todayStr);
      setWasPastDate(isPast);
      setDate(isPast ? todayStr : transfer.expectedDate || todayStr);
    }
  }, [isOpen, transfer, todayStr]);

  const numAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amount]);

  const sourcePool = useMemo(() => {
    if (!transfer?.sourcePoolId) return null;
    return pools.find((p) => p.id === transfer.sourcePoolId) || null;
  }, [pools, transfer?.sourcePoolId]);

  const destinationPool = useMemo(() => {
    if (!transfer?.destinationPoolId) return null;
    return pools.find((p) => p.id === transfer.destinationPoolId) || null;
  }, [pools, transfer?.destinationPoolId]);

  const sourceBalance = useMemo(() => {
    if (!sourcePool) return 0;
    const bal = typeof sourcePool.currentBalance === "string"
      ? parseFloat(sourcePool.currentBalance || "0")
      : (sourcePool.currentBalance ?? 0);
    return isNaN(bal) ? 0 : bal;
  }, [sourcePool]);

  const isInsufficient = numAmount > sourceBalance;
  const isFutureDate = Boolean(date && date > todayStr);

  const isDirty = useMemo(() => {
    if (!transfer) return false;
    const initialAmt = typeof transfer.expectedAmount === "number"
      ? transfer.expectedAmount.toFixed(2)
      : parseFloat(transfer.expectedAmount || "0").toFixed(2);
    const initialDate = wasPastDate ? todayStr : transfer.expectedDate;
    return name !== transfer.name || amount !== initialAmt || date !== initialDate;
  }, [transfer, name, amount, date, wasPastDate, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer || !name.trim() || numAmount <= 0 || isInsufficient || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isFutureDate) {
        await onSaveDraft({
          eventId: transfer.id,
          name: name.trim(),
          amount: numAmount.toFixed(2),
          expectedDate: date,
        });
      } else {
        await onConfirmTransfer({
          eventId: transfer.id,
          name: name.trim(),
          amount: numAmount.toFixed(2),
          sourcePoolId: transfer.sourcePoolId || undefined,
          destinationPoolId: transfer.destinationPoolId || undefined,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transfer || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDeleteTransfer(transfer.id);
      setShowDeleteConfirm(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transfer) return null;

  return (
    <>
      <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        title={t("modals.transfer.title", { defaultValue: "Transfer" })}
        isDirty={isDirty}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {wasPastDate && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <span className="text-sm">ℹ️</span>
              <span>
                {t("modals.transfer.pastDateAdjustedNotice", {
                  defaultValue: "This transfer was scheduled in the past and has been moved to today.",
                })}
              </span>
            </div>
          )}

          {/* Source & Destination Pool Display */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">
                {t("modals.transfer.sourcePool", { defaultValue: "Source Pool" })}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold block">
                {sourcePool?.name || transfer.sourcePoolName || "Source"}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {t("modals.transfer.available", {
                  amount: format(sourceBalance),
                  defaultValue: `${format(sourceBalance)} available`,
                })}
              </span>
            </div>
            <span className="text-slate-400 font-bold text-sm">➔</span>
            <div className="space-y-0.5 text-right">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">
                {t("modals.transfer.destinationPool", { defaultValue: "Destination Pool" })}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold block">
                {destinationPool?.name || transfer.destinationPoolName || "Destination"}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor={nameInputId} className="ui-label">
              {t("modals.transfer.nameLabel", { defaultValue: "Transfer Name" })}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              id={nameInputId}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ui-input w-full"
            />
          </div>

          <AmountField
            label={t("modals.transfer.amountLabel", { defaultValue: "Amount ($)" })}
            value={amount}
            onChange={setAmount}
            required
            allowNegative={false}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
          />

          {isInsufficient && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {t("modals.transfer.insufficientBalanceWarning", {
                poolName: sourcePool?.name || "Source Pool",
                available: format(sourceBalance),
                amount: format(numAmount),
                defaultValue: `Insufficient balance in ${sourcePool?.name || "Source Pool"}. Available: ${format(sourceBalance)}, requested: ${format(numAmount)}.`,
              })}
            </div>
          )}

          <DatePickerField
            label={t("modals.transfer.dateLabel", { defaultValue: "Transfer Date" })}
            value={date}
            onChange={setDate}
            required
            min={todayStr}
          />

          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-40"
            >
              {t("common.delete", { defaultValue: "Delete" })}
            </button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={!name.trim() || numAmount <= 0 || isInsufficient || isSubmitting}
              >
                {isFutureDate
                  ? t("common.save", { defaultValue: "Save" })
                  : t("common.confirm", { defaultValue: "Confirm" })}
              </Button>
            </div>
          </div>
        </form>
      </ModalDialog>

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title={t("modals.transfer.deleteConfirmTitle", { defaultValue: "Delete Transfer" })}
          description={t("modals.transfer.deletePrompt", {
            defaultValue: "Are you sure you want to delete this scheduled transfer? This action cannot be undone.",
          })}
          confirmLabel={t("common.delete", { defaultValue: "Delete" })}
          cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
          variant="danger"
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}
