"use client";

import React, { useState, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";

export interface BankTransferPool {
  id: string;
  name: string;
  poolType?: string;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
}

export interface BankTransferAccount {
  id: string;
  name: string;
  institution?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
  payId?: string | null;
}

export interface BankTransferRollupCardProps {
  readonly receivingAccountId?: string | null;
  readonly pools: BankTransferPool[];
  readonly linesMap: Record<string, string>;
  readonly sweepPoolId?: string;
  readonly sweepPoolRemainder: number;
  readonly bankAccounts: BankTransferAccount[];
  readonly paycheckAmount: number;
  readonly paycheckDate: string;
}

interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

export function BankTransferRollupCard({
  receivingAccountId,
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  bankAccounts,
  paycheckAmount: _paycheckAmount,
  paycheckDate: _paycheckDate,
}: BankTransferRollupCardProps) {
  const { fmt, currencySymbol, minorUnits } = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sourceAccount = useMemo(() => {
    if (receivingAccountId) {
      return bankAccounts.find((a) => a.id === receivingAccountId) || null;
    }
    return bankAccounts[0] || null;
  }, [receivingAccountId, bankAccounts]);

  const sourceAccountName = sourceAccount?.name || t("cards.paydayTransfer.sourceAccountDefault", { defaultValue: "Paycheck Account" });

  const { retainedItems, retainedTotal, externalTransfers } = useMemo(() => {
    const retained: Array<{ id: string; name: string; amount: number }> = [];
    const transferMap = new Map<string, DestinationTransferGroup>();

    for (const pool of pools) {
      const amount =
        pool.id === sweepPoolId
          ? Math.max(0, sweepPoolRemainder)
          : parseFloat(linesMap[pool.id] || "0");

      if (amount <= 0.005) continue;

      const isSameAccount =
        (receivingAccountId && pool.bankAccountId === receivingAccountId) ||
        (!pool.bankAccountId && (!receivingAccountId || pool.bankAccountId === receivingAccountId));

      if (isSameAccount) {
        retained.push({ id: pool.id, name: pool.name, amount });
      } else {
        const destId = pool.bankAccountId || "unknown-dest";
        const destAcc = bankAccounts.find((a) => a.id === destId);
        const destName = pool.bankAccountName || destAcc?.name || t("cards.paydayTransfer.destAccountDefault", { defaultValue: "External Account" });

        const existing = transferMap.get(destId);
        if (existing) {
          existing.totalAmount += amount;
          existing.pools.push({ id: pool.id, name: pool.name, amount });
        } else {
          transferMap.set(destId, {
            destAccountId: destId,
            destAccountName: destName,
            sourceAccountName,
            totalAmount: amount,
            payId: destAcc?.payId,
            pools: [{ id: pool.id, name: pool.name, amount }],
          });
        }
      }
    }

    const retainedSum = retained.reduce((acc, item) => acc + item.amount, 0);
    const externalList = Array.from(transferMap.values()).filter((g) => g.totalAmount > 0.005);

    return {
      retainedItems: retained,
      retainedTotal: retainedSum,
      externalTransfers: externalList,
    };
  }, [pools, linesMap, sweepPoolId, sweepPoolRemainder, receivingAccountId, bankAccounts, sourceAccountName]);

  const handleCopy = (amount: number, key: string) => {
    navigator.clipboard.writeText(amount.toFixed(minorUnits));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalActionItems = (retainedItems.length > 0 ? 1 : 0) + externalTransfers.length;
  if (totalActionItems === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb] bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900 shrink-0">
          {t("cards.paydayTransfer.badge", { defaultValue: "1-Tap Payday Transfer Plan" })}
        </span>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          {externalTransfers.length > 0
            ? t("cards.paydayTransfer.rollupDescription", {
                defaultValue: "Bank transfers are rolled up by destination account so you only make 1 transfer per bank:",
              })
            : t("cards.paydayTransfer.allRetainedDescription", {
                defaultValue: "All allocations remain in your source account. No external bank transfers needed!",
              })}
        </p>
      </div>

      {/* Retained in Source Account Card */}
      {retainedItems.length > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black">✓</span>
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                {t("cards.paydayTransfer.retainedTitle", { defaultValue: "Retained in" })} {sourceAccountName}
              </span>
            </div>
            <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
              {fmt(retainedTotal)}
            </span>
          </div>

          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 leading-snug">
            {t("cards.paydayTransfer.noTransferNeeded", { defaultValue: "No transfer required — funds stay in this account for:" })}{" "}
            <span className="font-semibold">
              {retainedItems.map((p) => `${p.name} (${fmt(p.amount)})`).join(", ")}
            </span>
          </p>
        </div>
      )}

      {/* External Transfers Rolled Up by Destination Account */}
      {externalTransfers.length > 0 && (
        <div className="space-y-3">
          <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-400">
            {t("cards.paydayTransfer.transfersRequired", { defaultValue: "Required Transfers" })} ({externalTransfers.length})
          </span>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
            {externalTransfers.map((group) => {
              const copyKey = group.destAccountId;
              const isCopied = copiedKey === copyKey;

              return (
                <div
                  key={group.destAccountId}
                  className="p-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors space-y-2"
                >
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
                        onClick={() => handleCopy(group.totalAmount, copyKey)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#2563eb] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200/60 dark:border-blue-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title={t("cards.paydayTransfer.copyTooltip", { defaultValue: "Copy amount to clipboard for banking app" })}
                      >
                        {isCopied
                          ? t("common.copied", { defaultValue: "✓ Copied" })
                          : `${t("common.copy", { defaultValue: "Copy" })} ${currencySymbol}`}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    <span className="font-bold text-zinc-600 dark:text-zinc-300">
                      {t("cards.paydayTransfer.coversPools", {
                        count: group.pools.length,
                        defaultValue: `Covers ${group.pools.length} pool${group.pools.length === 1 ? "" : "s"}: `,
                      })}
                    </span>
                    {group.pools.map((p) => `${p.name} (${fmt(p.amount)})`).join(", ")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
