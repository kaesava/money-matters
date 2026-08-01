'use client';

import React, { useState } from 'react';
import { t } from '@money-matters/i18n';

export interface BankTransferPromptCardProps {
  poolName: string;
  newAccountName: string;
  amount: number;
  fromAccountName?: string;
  onDismiss?: () => void;
}

export function BankTransferPromptCard({
  poolName,
  newAccountName,
  amount,
  fromAccountName = "old account",
  onDismiss,
}: BankTransferPromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(amount.toFixed(2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  return (
    <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="text-xl">🏦</span>
          <div>
            <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
              {t("bank.transferRequiredTitle", { defaultValue: "Bank Account Switch Action Required" })}
            </h4>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              {t("bank.transferPromptMsg", { defaultValue: `You switched your ${poolName} to ${newAccountName}. Transfer your current balance ($${amount.toFixed(2)}) from ${fromAccountName} to ${newAccountName} to align physical funds.` })}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-500 hover:text-amber-700 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-amber-900/60">
        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 font-mono">
          Amount: ${amount.toFixed(2)}
        </span>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
        >
          {copied ? "Copied! ✓" : `Copy $${amount.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
