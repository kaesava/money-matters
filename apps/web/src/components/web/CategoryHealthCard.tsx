"use client";
import React from "react";
import { t } from "@money-matters/i18n";

type HealthStatus = "GREEN" | "AMBER" | "RED";

interface CategoryHealthCardProps {
  id: string;
  name: string;
  type: string;
  balance: string;
  target?: string | null;
  health: HealthStatus;
  nextDueDate: string | null;
  progressPercentage: number;
  onClick: () => void;
}

const STATUS_COLOR: Record<HealthStatus, string> = {
  GREEN: "var(--dash-success)",
  AMBER: "var(--dash-warning)",
  RED: "var(--dash-critical)",
};

const STATUS_BG: Record<HealthStatus, string> = {
  GREEN: "rgba(34,197,94,0.1)",
  AMBER: "rgba(245,158,11,0.1)",
  RED: "rgba(239,68,68,0.1)",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  GREEN: "●",
  AMBER: "●",
  RED: "●",
};

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Web port of the mobile CategoryHealthCard. Clickable card → BucketDetailDrawer. */
export function CategoryHealthCard({
  id,
  name,
  type,
  balance,
  target,
  health,
  nextDueDate,
  progressPercentage,
  onClick,
}: CategoryHealthCardProps) {
  const color = STATUS_COLOR[health];
  const bg = STATUS_BG[health];
  const balanceNum = parseFloat(balance);
  const hasTarget = target != null && parseFloat(target) > 0;

  const dueDateLabel = nextDueDate
    ? t("buckets.nextDue", { date: new Date(nextDueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) })
    : null;

  return (
    <button
      id={`bucket-card-${id}`}
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--dash-teal]"
      style={{
        backgroundColor: "var(--dash-surface)",
        border: `1px solid var(--dash-border)`,
        boxShadow: "var(--dash-shadow-sm)",
      }}
      aria-label={`${name} — ${fmt(balance)}`}
    >
      {/* Row 1: dot + name + balance */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none shrink-0" style={{ color }}>{STATUS_LABEL[health]}</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--dash-text)" }}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dueDateLabel && (
            <span className="text-xs hidden sm:block" style={{ color: "var(--dash-muted)" }}>
              {dueDateLabel}
            </span>
          )}
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {fmt(balance)}
          </span>
        </div>
      </div>

      {/* Row 2: progress bar (only for MAJOR + RECURRING) */}
      {hasTarget && (
        <div className="flex flex-col gap-1">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: bg }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, progressPercentage)}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold" style={{ color }}>
              {t("buckets.progressPct", { pct: progressPercentage })}
            </span>
            {target && (
              <span className="text-xs" style={{ color: "var(--dash-muted)" }}>
                {t("buckets.target")} {fmt(target!)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 3: negative balance warning */}
      {balanceNum < 0 && (
        <div
          className="text-xs font-bold px-2 py-1 rounded-lg"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "var(--dash-critical)" }}
        >
          ⚠ {t("shortfall.alertTitle")}
        </div>
      )}
    </button>
  );
}
