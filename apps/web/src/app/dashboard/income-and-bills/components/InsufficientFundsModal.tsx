"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";

export interface CategoryOption {
  id: string;
  name: string;
  currentBalance: number;
  isSurplusTarget?: boolean;
}

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  billName: string;
  shortfallAmount: number;
  availableCategories: CategoryOption[];
  onConfirmTransferAndPay: (fundingCategoryId: string) => Promise<void>;
}

export function InsufficientFundsModal({
  isOpen,
  onClose,
  billName,
  shortfallAmount,
  availableCategories,
  onConfirmTransferAndPay,
}: InsufficientFundsModalProps) {
  const surplusCategory = availableCategories.find((c) => c.isSurplusTarget) || availableCategories[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(surplusCategory?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedCategoryId) return;
    setIsSubmitting(true);
    try {
      await onConfirmTransferAndPay(selectedCategoryId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        <h3 className="text-lg font-black text-[#1B2B4B] dark:text-white">
          {t("incomeBillsTabs.insufficientModalTitle")}
        </h3>
        <div className="flex flex-col gap-6 py-2">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t("incomeBillsTabs.insufficientModalMessage", { amount: `$${shortfallAmount.toFixed(2)}` })}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Paying <strong>{billName}</strong> requires an additional ${shortfallAmount.toFixed(2)} to avoid a negative pool balance.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#1B2B4B] dark:text-zinc-200 uppercase tracking-wider">
              {t("incomeBillsTabs.fundingSourceSelectLabel")}
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2563eb]"
            >
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.isSurplusTarget ? `(${t("incomeBillsTabs.surplusBufferLabel")})` : ""} - Balance: ${cat.currentBalance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedCategoryId}
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Processing..." : t("incomeBillsTabs.confirmTransferAndPay")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
