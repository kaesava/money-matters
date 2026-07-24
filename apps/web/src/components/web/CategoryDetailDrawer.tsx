"use client";
import React from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";
import { FileNotesSection } from "./FileNotesSection";

interface CategoryDetailDrawerProps {
  categoryId: string | null;
  onClose: () => void;
  onResolveShortfall?: (categoryId: string) => void;
}

type HealthStatus = "GREEN" | "AMBER" | "RED";

const STATUS_COLOR: Record<HealthStatus, string> = {
  GREEN: "var(--dash-success)",
  AMBER: "var(--dash-warning)",
  RED: "var(--dash-critical)",
};

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Slide-in panel showing category detail + transaction history. */
export function CategoryDetailDrawer({ categoryId, onClose }: CategoryDetailDrawerProps) {
  if (!categoryId) return null;

  const categoriesQuery = trpc.listCategories.useQuery();

  const cat = (categoriesQuery.data ?? []).find((c: { id: string }) => c.id === categoryId);

  if (!cat && !categoriesQuery.isLoading) {
    return (
      <SlideOverDrawer title={t("categories.detail.title")} onClose={onClose} widthClass="max-w-lg">
        <div className="p-6 flex flex-col items-center gap-2 py-12">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("common.error")}</p>
        </div>
      </SlideOverDrawer>
    );
  }

  const health = (cat?.healthStatus ?? "GREEN") as HealthStatus;
  const color = STATUS_COLOR[health];
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
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
          ))}
        </div>
      ) : cat ? (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--dash-border)" }}>

          {/* Balance section */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                  {t("categories.detail.currentBalance")}
                </p>
                <p className="text-3xl font-extrabold mt-1 tabular-nums" style={{ color }}>
                  {fmt(cat.currentBalance)}
                </p>
              </div>
              {/* Health status badge */}
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: `${color}18`,
                  color,
                }}
              >
                {health === "GREEN" ? "On Track" : health === "AMBER" ? "At Risk" : "Underfunded"}
              </span>
            </div>

            {/* Target + progress */}
            {targetNum !== null && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-medium" style={{ color: "var(--dash-muted)" }}>
                  <span>{t("categories.detail.targetAmount")}: {fmt(targetNum)}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${color}18` }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )}

            {/* Due date */}
            {cat.targetDate && (
              <p className="text-xs font-medium" style={{ color: "var(--dash-muted)" }}>
                {t("categories.nextDue", {
                  date: new Date(cat.targetDate).toLocaleDateString("en-AU", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  }),
                })}
              </p>
            )}
          </div>

          {/* Transaction history section */}
          <div className="p-6 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
              {t("categories.detail.history")}
            </p>
            <TransactionHistory categoryId={categoryId} />
            <FileNotesSection entityType="CATEGORY" entityId={categoryId} />
          </div>
        </div>
      ) : null}
    </SlideOverDrawer>
  );
}

/** Inner component to load and display transaction history for a category */
function TransactionHistory({ categoryId }: { categoryId: string }) {
  const transactionsQuery = trpc.listCategoryTransactions.useQuery({ categoryId, limit: 5 });
  const txs = transactionsQuery.data ?? [];

  if (transactionsQuery.isLoading) {
    return <div className="py-6 text-center text-xs text-zinc-400">Loading history...</div>;
  }

  if (txs.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-6 rounded-xl text-center"
        style={{ backgroundColor: "var(--dash-bg)" }}
      >
        <span className="text-xl">📋</span>
        <p className="text-xs font-semibold" style={{ color: "var(--dash-muted)" }}>
          No transaction history for this category.
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
      {(txs as TransactionItem[]).slice(0, 5).map((tx: TransactionItem) => (
        <div key={tx.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[#1B2B4B]">{tx.note || tx.categoryName || "Expense"}</span>
            <span className="text-[10px] text-zinc-400">
              {new Date(tx.recordedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <span className={`font-black ${tx.flowType === "DEBIT" ? "text-rose-600" : "text-emerald-600"}`}>
            {tx.flowType === "DEBIT" ? "-" : "+"}{fmt(tx.amount)}
          </span>
        </div>
      ))}

      <div className="pt-2 text-right">
        <a
          href={`/dashboard/transactions?categoryId=${categoryId}`}
          className="text-xs font-bold text-[#00B4A6] hover:underline inline-flex items-center gap-1"
        >
          <span>View All Transactions</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
