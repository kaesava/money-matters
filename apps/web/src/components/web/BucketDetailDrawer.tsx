"use client";
import React from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";

interface BucketDetailDrawerProps {
  categoryId: string;
  onClose: () => void;
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
export function BucketDetailDrawer({ categoryId, onClose }: BucketDetailDrawerProps) {
  const categoriesQuery = trpc.listCategories.useQuery();

  const cat = (categoriesQuery.data ?? []).find((c) => c.id === categoryId);

  if (!cat && !categoriesQuery.isLoading) {
    return (
      <SlideOverDrawer title={t("buckets.detail.title")} onClose={onClose} widthClass="max-w-lg">
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
      title={cat?.name ?? t("buckets.detail.title")}
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
                  {t("buckets.detail.currentBalance")}
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
                  <span>{t("buckets.detail.targetAmount")}: {fmt(targetNum)}</span>
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
            {cat.nextDueDate && (
              <p className="text-xs font-medium" style={{ color: "var(--dash-muted)" }}>
                {t("buckets.nextDue", {
                  date: new Date(cat.nextDueDate).toLocaleDateString("en-AU", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  }),
                })}
              </p>
            )}
          </div>

          {/* Transaction history section */}
          <div className="p-6 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
              {t("buckets.detail.history")}
            </p>
            <TransactionHistory categoryId={categoryId} />
          </div>
        </div>
      ) : null}
    </SlideOverDrawer>
  );
}

/** Inner component to load and display transaction history for a category */
function TransactionHistory({ categoryId: _categoryId }: { categoryId: string }) {
  // We use listCategories to get the basic category data; 
  // In a full implementation this would call a dedicated getTransactionsByCategory query.
  // For V1, we show a placeholder with the data we have.
  return (
    <div
      className="flex flex-col items-center gap-2 py-8 rounded-xl text-center"
      style={{ backgroundColor: "var(--dash-bg)" }}
    >
      <span className="text-2xl">📋</span>
      <p className="text-sm font-medium" style={{ color: "var(--dash-text)" }}>
        {t("buckets.detail.history")}
      </p>
      <p className="text-xs" style={{ color: "var(--dash-muted)" }}>
        {t("buckets.detail.noHistory")}
      </p>
    </div>
  );
}
