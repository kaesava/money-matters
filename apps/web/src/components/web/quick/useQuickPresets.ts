import { useMemo } from "react";
import {
  computeRecentAndFrequentPresets,
  isPaydayOrAdjustment,
} from "@money-matters/types";

export interface TransactionSummaryItem {
  id: string;
  flowType: string;
  transferGroupId?: string | null;
  note?: string | null;
  amount?: string | null;
  envelopeId?: string | null;
  bankAccountId?: string | null;
  recordedAt?: string | Date | null;
}

export interface EnvelopeSummaryItem {
  id: string;
  name: string;
  envelopeType?: string;
  categories?: Array<{ id: string; name: string }>;
}

export function useQuickPresets(
  txList: TransactionSummaryItem[],
  categories: EnvelopeSummaryItem[]
) {
  const quickExpensePresets = useMemo(() => {
    const validTxs = txList.filter(
      (tx) => tx.flowType === "DEBIT" && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)
    );
    return computeRecentAndFrequentPresets(
      validTxs,
      (tx) => tx.note?.trim().toLowerCase() || null,
      (tx) => ({
        name: tx.note!.trim(),
        amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
        categoryId: tx.envelopeId || undefined,
      }),
      (tx) => (tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now())
    );
  }, [txList]);

  const quickIncomePresets = useMemo(() => {
    const validTxs = txList.filter(
      (tx) => tx.flowType === "CREDIT" && !tx.transferGroupId && tx.note && !isPaydayOrAdjustment(tx.note)
    );
    return computeRecentAndFrequentPresets(
      validTxs,
      (tx) => tx.note?.trim().toLowerCase() || null,
      (tx) => ({
        name: tx.note!.trim(),
        amount: tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined,
        categoryId: tx.envelopeId || undefined,
        receivingAccountId: tx.bankAccountId || undefined,
      }),
      (tx) => (tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now())
    );
  }, [txList]);

  const quickTransferPresets = useMemo(() => {
    const transfersByGroup = new Map<
      string,
      {
        sourceCatId?: string;
        destCatId?: string;
        amount?: string;
        note: string;
        timestamp: number;
      }
    >();

    for (const tx of txList) {
      if (!tx.transferGroupId) continue;
      const existing = transfersByGroup.get(tx.transferGroupId) || {
        note: tx.note || "Transfer",
        timestamp: tx.recordedAt ? new Date(tx.recordedAt).getTime() : Date.now(),
      };
      if (tx.flowType === "DEBIT") {
        existing.sourceCatId = tx.envelopeId || undefined;
        existing.amount = tx.amount ? parseFloat(tx.amount).toFixed(2) : undefined;
      } else if (tx.flowType === "CREDIT") {
        existing.destCatId = tx.envelopeId || undefined;
      }
      transfersByGroup.set(tx.transferGroupId, existing);
    }

    const catNameMap = new Map<string, string>();
    for (const c of categories) {
      catNameMap.set(c.id, c.name);
      if (c.categories) {
        for (const sub of c.categories) {
          catNameMap.set(sub.id, `${c.name} › ${sub.name}`);
        }
      }
    }

    const transferItems = Array.from(transfersByGroup.values()).map((transfer) => {
      const srcName = transfer.sourceCatId ? catNameMap.get(transfer.sourceCatId) : null;
      const dstName = transfer.destCatId ? catNameMap.get(transfer.destCatId) : null;

      let displayName = transfer.note.trim();
      if (srcName && dstName && (displayName === "Transfer" || displayName.startsWith("Transferred"))) {
        displayName = `${srcName} ➔ ${dstName}`;
      }
      return {
        ...transfer,
        displayName,
      };
    }).filter((t) => !isPaydayOrAdjustment(t.displayName));

    return computeRecentAndFrequentPresets(
      transferItems,
      (t) => t.displayName.toLowerCase(),
      (t) => ({
        name: t.displayName,
        amount: t.amount,
        sourceCategoryId: t.sourceCatId,
        destinationCategoryId: t.destCatId,
      }),
      (t) => t.timestamp
    );
  }, [txList, categories]);

  return {
    quickExpensePresets,
    quickIncomePresets,
    quickTransferPresets,
  };
}
