'use client';

import React, { useState } from 'react';
import { t } from '@money-matters/i18n';

export interface PaydayTransferItem {
  id: string;
  targetAccountName: string;
  amount: number;
  purpose: string;
}

export interface PaydayTransferCardProps {
  transfers: PaydayTransferItem[];
  paydayDateStr?: string;
}

export function PaydayTransferCard({
  transfers,
  paydayDateStr = "Today",
}: PaydayTransferCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, amount: number) => {
    try {
      await navigator.clipboard.writeText(amount.toFixed(2));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (transfers.length === 0) return null;

  return (
    <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
            🇦🇺 {t("payday.transferPlanTitle", { defaultValue: "Payday Bank Transfer Plan" })}
          </h3>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            {t("payday.transferPlanSubtitle", { defaultValue: `Recommended mobile banking transfers for ${paydayDateStr}` })}
          </p>
        </div>
        <span className="rounded-full bg-emerald-200/60 dark:bg-emerald-900 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-200">
          Osko / PayID Ready
        </span>
      </div>

      <div className="space-y-2 mt-3">
        {transfers.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950"
          >
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Transfer to {item.targetAccountName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {item.purpose}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                ${item.amount.toFixed(2)}
              </span>
              <button
                onClick={() => handleCopy(item.id, item.amount)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                {copiedId === item.id ? "Copied! ✓" : "Copy $"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
