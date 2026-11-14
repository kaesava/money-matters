"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";

export interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

interface DestinationTransferItemProps {
  readonly group: DestinationTransferGroup;
  readonly isCopied: boolean;
  readonly onCopy: (amount: number, key: string) => void;
}

export function DestinationTransferItem({
  group,
  isCopied,
  onCopy,
}: DestinationTransferItemProps) {
  const { fmt, currencySymbol } = useLocale();

  return (
    <div className="p-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#1B2B4B] dark:text-white">
              {group.sourceAccountName}
            </span>
            <span className="text-zinc-400 text-xs">→</span>
            <span className="text-xs font-black text-[#2563eb] dark:text-blue-400 truncate">
              {group.destAccountName}
            </span>
          </div>

          {group.payId && (
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
              PayID: {group.payId}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-black text-xs text-[#1B2B4B] dark:text-white tabular-nums">
            {fmt(group.totalAmount)}
          </span>
          <button
            type="button"
            onClick={() => onCopy(group.totalAmount, group.destAccountId)}
            className="px-2.5 py-1 text-[11px] font-bold text-[#2563eb] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200/60 dark:border-blue-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title={t("cards.paydayTransfer.copyTooltip")}
          >
            {isCopied
              ? t("cards.paydayTransfer.copiedCheck")
              : t("cards.paydayTransfer.copyAmount", { symbol: currencySymbol })}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
        <span className="font-bold text-zinc-600 dark:text-zinc-300">
          {t("cards.paydayTransfer.coversPools", {
            count: group.pools.length,
          })}
        </span>
        {group.pools.map((p) => `${p.name} (${fmt(p.amount)})`).join(", ")}
      </p>
    </div>
  );
}
