"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { ModalDialog, Button } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import { DestinationTransferItem, DestinationTransferGroup } from "./DestinationTransferItem";

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

export interface PaydayTransferModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly receivingAccountId?: string | null;
  readonly pools: BankTransferPool[];
  readonly linesMap: Record<string, string>;
  readonly sweepPoolId?: string;
  readonly sweepPoolRemainder: number;
  readonly bankAccounts: BankTransferAccount[];
}

export function PaydayTransferModal({
  isOpen,
  onClose,
  receivingAccountId,
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  bankAccounts,
}: PaydayTransferModalProps) {
  const { fmt, minorUnits } = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sourceAccount = useMemo(() => {
    if (receivingAccountId) {
      return bankAccounts.find((a) => a.id === receivingAccountId) || null;
    }
    return bankAccounts[0] || null;
  }, [receivingAccountId, bankAccounts]);

  const sourceAccountName = sourceAccount?.name || t("cards.paydayTransfer.sourceAccountDefault");

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
        const destName = pool.bankAccountName || destAcc?.name || t("cards.paydayTransfer.destAccountDefault");

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

    return {
      retainedItems: retained,
      retainedTotal: retained.reduce((acc, item) => acc + item.amount, 0),
      externalTransfers: Array.from(transferMap.values()).filter((g) => g.totalAmount > 0.005),
    };
  }, [pools, linesMap, sweepPoolId, sweepPoolRemainder, receivingAccountId, bankAccounts, sourceAccountName]);

  const handleCopy = (amount: number, key: string) => {
    navigator.clipboard.writeText(amount.toFixed(minorUnits));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("cards.paydayTransfer.badge")}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          {externalTransfers.length > 0
            ? t("cards.paydayTransfer.rollupDescription")
            : t("cards.paydayTransfer.allRetainedDescription")}
        </p>

        {retainedItems.length > 0 && (
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black">✓</span>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                  {t("cards.paydayTransfer.retainedTitle")} {sourceAccountName}
                </span>
              </div>
              <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                {fmt(retainedTotal)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 leading-snug">
              {t("cards.paydayTransfer.noTransferNeeded")}{" "}
              <span className="font-semibold">
                {retainedItems.map((p) => `${p.name} (${fmt(p.amount)})`).join(", ")}
              </span>
            </p>
          </div>
        )}

        {externalTransfers.length > 0 && (
          <div className="space-y-2.5">
            <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-400">
              {t("cards.paydayTransfer.transfersRequired")} ({externalTransfers.length})
            </span>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              {externalTransfers.map((group) => (
                <DestinationTransferItem
                  key={group.destAccountId}
                  group={group}
                  isCopied={copiedKey === group.destAccountId}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </div>
        )}

        {externalTransfers.length === 0 && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                {t("cards.paydayTransfer.singleAccountProTipTitle")}
              </span>
              <Link
                href="/blog/the-2-account-blueprint"
                className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
              >
                {t("cards.paydayTransfer.singleAccountLearnMore")}
              </Link>
            </div>
            <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
              {t("cards.paydayTransfer.singleAccountProTipDesc")}
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#2563eb] text-white font-bold text-sm rounded-xl"
          >
            {t("common.done")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
