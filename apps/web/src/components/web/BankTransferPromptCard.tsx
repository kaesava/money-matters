"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";

export interface BankTransferPromptCardProps {
  readonly sourceAccountName: string;
  readonly targetAccountName: string;
  readonly transferAmount: number;
  readonly reason: string;
  readonly onDone?: () => void;
}

const fmt = (val: number) => `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BankTransferPromptCard({
  sourceAccountName,
  targetAccountName,
  transferAmount,
  reason,
  onDone,
}: BankTransferPromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(transferAmount.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-200/80 p-4 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#2563eb] font-bold flex items-center justify-center text-lg shrink-0">
          🏦
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-200/60 px-2 py-0.5 rounded-full">
            {t("cards.bankTransfer.badge", { defaultValue: "Bank Account Action Required" })}
          </span>
          <h4 className="text-xs font-bold text-[#1B2B4B] mt-0.5">
            {t("cards.bankTransfer.transferLabel", { defaultValue: "Transfer" })} <span className="font-mono font-extrabold text-[#2563eb]">{fmt(transferAmount)}</span> from {sourceAccountName} → {targetAccountName}
          </h4>
          <p className="text-[11px] text-blue-800 mt-0.5">{reason}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-1"
        >
          {copied ? "✓ Copied!" : "Copy Amount"}
        </button>
        {onDone && (
          <button
            onClick={onDone}
            className="px-2.5 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 bg-white/80 border border-zinc-200 rounded-xl transition-colors"
          >
            {t("common.dismiss", { defaultValue: "Dismiss" })}
          </button>
        )}
      </div>
    </div>
  );
}

export default BankTransferPromptCard;
