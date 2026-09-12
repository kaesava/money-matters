"use client";

import React, { useState, useId } from "react";
import { createPortal } from "react-dom";
import { t } from "@money-matters/i18n";
import { Button, useModalDismiss } from "@money-matters/ui/web";
import { useLocale } from "../../providers/LocaleProvider";

export interface CrossBankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAccountName: string;
  destAccountName: string;
  amount: number;
  payId?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
}

export function CrossBankTransferModal({
  isOpen,
  onClose,
  sourceAccountName,
  destAccountName,
  amount,
  payId,
  bsb,
  accountNumber,
}: CrossBankTransferModalProps) {
  const { fmt, currencySymbol, minorUnits } = useLocale();
  const [copied, setCopied] = useState(false);
  const modalId = useId();

  useModalDismiss({
    id: `cross-bank-transfer-modal-${modalId}`,
    isOpen,
    onDismiss: onClose,
  });

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toFixed(minorUnits));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h3 className="font-extrabold text-base text-[#1B2B4B]">
              {t("modals.crossBankTransfer.title", { defaultValue: "Bank Transfer Required" })}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg transition-colors cursor-pointer text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {t("modals.crossBankTransfer.description", {
            defaultValue: "You transferred funds between pools linked to different bank accounts. Remember to move the physical money in your banking app:",
          })}
        </p>

        {/* Transfer Instruction Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {t("modals.crossBankTransfer.fromAccount", { defaultValue: "From Bank Account:" })}
            </span>
            <span className="font-bold text-[#1B2B4B]">{sourceAccountName}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {t("modals.crossBankTransfer.toAccount", { defaultValue: "To Bank Account:" })}
            </span>
            <div className="text-right">
              <span className="font-bold text-[#1B2B4B]">{destAccountName}</span>
              {payId && (
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">PayID: {payId}</p>
              )}
              {bsb && accountNumber && (
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  BSB: {bsb} • Acc: {accountNumber}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("modals.crossBankTransfer.amount", { defaultValue: "Amount to Move" })}
              </span>
              <p className="font-mono font-black text-lg text-[#2563eb] tabular-nums">
                {fmt(amount)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyAmount}
              className="px-3 py-1.5 text-xs font-bold text-[#2563eb] hover:text-white bg-blue-50 hover:bg-[#2563eb] border border-blue-200/80 hover:border-[#2563eb] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>{copied ? "✓ Copied" : `Copy ${currencySymbol}`}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="button" variant="primary" onClick={onClose} className="w-full">
            {t("common.done", { defaultValue: "Done" })}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
