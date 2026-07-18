"use client";
import React from "react";
import { t } from "@money-matters/i18n";

interface PaycheckReadinessCardProps {
  daysUntil: number | null;
  expectedAmount: number | null; // in cents
  sourceName: string | null;
  onTrack: number;
  atRisk: number;
  onReview: () => void;
  hasDraftPlan: boolean;
}

/** Web port of the mobile PaycheckReadinessPanel — navy card, teal CTA. */
export function PaycheckReadinessCard({
  daysUntil,
  expectedAmount,
  sourceName,
  onTrack,
  atRisk,
  onReview,
  hasDraftPlan,
}: PaycheckReadinessCardProps) {
  const fmt = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const dayLabel =
    daysUntil === null
      ? t("home.noUpcomingPaycheck")
      : daysUntil === 0
      ? t("home.paydayToday")
      : t("home.paydayIn", { days: daysUntil });

  return (
    <div
      className="rounded-2xl p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      style={{
        background: "linear-gradient(135deg, var(--dash-navy) 0%, #263d6b 100%)",
        boxShadow: "0 8px 32px rgba(27,43,75,0.25)",
      }}
    >
      {/* Left: paycheck info */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("home.nextPaycheck")}
          {sourceName && <span className="normal-case font-normal ml-1 opacity-70">· {sourceName}</span>}
        </p>
        <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {expectedAmount !== null ? fmt(expectedAmount) : "—"}
        </p>
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
          {dayLabel}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-5 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--dash-success)" }} />
            <span className="text-xs font-semibold text-white">
              {t("home.onTrack", { count: onTrack })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--dash-warning)" }} />
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
              {t("home.atRisk", { count: atRisk })}
            </span>
          </div>
        </div>
      </div>

      {/* Right: CTA */}
      {hasDraftPlan && (
        <button
          id="review-allocation-btn"
          onClick={onReview}
          className="self-start shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 hover:opacity-90"
          style={{ backgroundColor: "var(--dash-teal)" }}
        >
          {t("home.reviewAllocation")}
        </button>
      )}
    </div>
  );
}
