"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { Button, ModalDialog } from "@money-matters/ui/web";
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

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toFixed(minorUnits));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <span>{t("modals.crossBankTransfer.title")}</span>
        </div>
      }
      subtitle={t("modals.crossBankTransfer.description")}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {/* Transfer Instruction Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {t("modals.crossBankTransfer.fromAccount")}
            </span>
            <span className="font-bold text-[#1B2B4B]">{sourceAccountName}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {t("modals.crossBankTransfer.toAccount")}
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
                {t("modals.crossBankTransfer.amount")}
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
              <span>{copied ? t("modals.crossBankTransfer.copiedCheck") : t("modals.crossBankTransfer.copyAmount", { symbol: currencySymbol })}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="button" variant="primary" onClick={onClose} className="w-full">
            {t("common.done")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
