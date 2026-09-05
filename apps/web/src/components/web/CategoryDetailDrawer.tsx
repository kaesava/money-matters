"use client";
import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer, fmtDate } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";

export interface CategoryDetailItem {
  id: string;
  name: string;
  type: string;
  currentBalance: string;
  healthStatus?: string;
  targetAmount?: string | null;
  targetDate?: string | null;
  progressPercentage?: number;
}

interface CategoryDetailDrawerProps {
  categoryId: string | null;
  onClose: () => void;
  onEdit?: (cat: CategoryDetailItem) => void;
  onArchive?: (cat: CategoryDetailItem) => void;
  onResolveShortfall?: (categoryId: string) => void;
}

type HealthStatus = "GREEN" | "AMBER" | "RED";

const STATUS_COLOR: Record<HealthStatus, string> = {
  GREEN: "#22C55E",
  AMBER: "#F59E0B",
  RED: "#EF4444",
};

const STATUS_BG: Record<HealthStatus, string> = {
  GREEN: "#DCFCE7",
  AMBER: "#FEF3C7",
  RED: "#FEE2E2",
};

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Slide-in panel showing category detail + transaction history. */
export function CategoryDetailDrawer({ categoryId, onClose, onEdit, onArchive }: CategoryDetailDrawerProps) {
  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: Boolean(categoryId),
  });

  if (!categoryId) return null;

  const cat = (categoriesQuery.data ?? []).find((c: { id: string }) => c.id === categoryId) as CategoryDetailItem | undefined;

  if (!cat && !categoriesQuery.isLoading) {
    return (
      <SlideOverDrawer title={t("categories.detail.title")} onClose={onClose} widthClass="max-w-lg">
        <div className="p-6 flex flex-col items-center gap-2 py-12">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm font-semibold text-zinc-800">{t("common.error")}</p>
        </div>
      </SlideOverDrawer>
    );
  }

  const health = (cat?.healthStatus ?? "GREEN") as HealthStatus;
  const color = STATUS_COLOR[health];
  const bgColor = STATUS_BG[health];
  const targetNum = cat?.targetAmount ? parseFloat(cat.targetAmount) : null;
  const pct = cat?.progressPercentage ?? 0;

  return (
    <SlideOverDrawer
      title={cat?.name ?? t("categories.detail.title")}
      subtitle={cat?.type ?? ""}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      {categoriesQuery.isLoading ? (
        <div className="p-6 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : cat ? (
        <div className="flex flex-col divide-y divide-zinc-100">

          {/* Balance section */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: bgColor,
                  color,
                }}
              >
                {health === "GREEN" ? "On Track" : health === "AMBER" ? "At Risk" : "Underfunded"}
              </span>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(cat)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-colors"
                >
                  {t("common.edit")}
                </button>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {cat.type === "GOAL" ? "Current Balance" : t("categories.detail.currentBalance")}
              </p>
              <p className="text-3xl font-extrabold mt-1 tabular-nums" style={{ color }}>
                {fmt(cat.currentBalance)}
              </p>
            </div>

            {/* Target + progress */}
            {targetNum !== null && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span>{t("categories.detail.targetAmount")}: {fmt(targetNum)}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: bgColor }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )}

            {/* Due date */}
            {cat.targetDate && (
              <p className="text-xs font-medium text-zinc-500">
                {t("categories.nextDue", {
                  date: fmtDate(cat.targetDate, "Australia/Sydney"),
                })}
              </p>
            )}
          </div>

          {/* Transaction history section */}
          <div className="p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t("categories.detail.history")}
            </p>
            <TransactionHistory categoryId={categoryId} categoryName={cat.name} onClose={onClose} />

            {onArchive && cat.type !== "EVERYDAY" && (
              <div className="pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onArchive(cat)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {t("common.archive")}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SlideOverDrawer>
  );
}

/** Inner component to load and display transaction history for a category */
function TransactionHistory({
  categoryId,
  categoryName,
  onClose,
}: {
  categoryId: string;
  categoryName?: string;
  onClose?: () => void;
}) {
  const transactionsQuery = trpc.listCategoryTransactions.useQuery(
    { categoryId, limit: 5 },
    { enabled: Boolean(categoryId) }
  );
  const txs = transactionsQuery.data ?? [];

  if (transactionsQuery.isLoading) {
    return <div className="py-6 text-center text-xs text-zinc-400">{t("drawers.categoryDetail.loadingHistory")}</div>;
  }

  if (txs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 rounded-xl text-center bg-zinc-50">
        <span className="text-xl">📋</span>
        <p className="text-xs font-semibold text-zinc-500">
          {t("drawers.categoryDetail.noHistory", { defaultValue: "No transaction history for this category." })}
        </p>
      </div>
    );
  }

  interface TransactionItem {
    id: string;
    note?: string | null;
    categoryName?: string;
    recordedAt: string | Date;
    flowType: string;
    amount: string;
  }

  return (
    <div className="flex flex-col gap-2">
      {(txs as TransactionItem[]).slice(0, 5).map((tx: TransactionItem) => {
        const recDate = tx.recordedAt ? new Date(tx.recordedAt) : new Date();
        const dateStr = !isNaN(recDate.getTime())
          ? fmtDate(recDate, "Australia/Sydney")
          : "—";

        return (
          <div key={tx.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#1B2B4B]">{tx.note || tx.categoryName || "Expense"}</span>
              <span className="text-[10px] text-zinc-400">{dateStr}</span>
            </div>
            <span className={`font-black ${tx.flowType === "DEBIT" ? "text-rose-600" : "text-emerald-600"}`}>
              {tx.flowType === "DEBIT" ? "-" : "+"}{fmt(tx.amount)}
            </span>
          </div>
        );
      })}

      <div className="pt-2 text-right">
        <Link
          href={`/dashboard/history?search=${encodeURIComponent(categoryName || "")}`}
          onClick={() => onClose?.()}
          className="text-xs font-bold text-[#00B4A6] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{t("drawers.categoryDetail.viewAllTransactions", { defaultValue: "View All Transactions" })}</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
