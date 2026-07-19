"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { AllocationReviewDrawer } from "../../../components/web/AllocationReviewDrawer";
import { DashboardError } from "../../../components/web/DashboardError";

type IncomeEventStatus = "UPCOMING" | "DRAFT" | "REVIEWED" | "CONFIRMED";

const STATUS_CONFIG: Record<IncomeEventStatus, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: "paychecks.upcoming", color: "var(--dash-muted)", bg: "var(--dash-bg)" },
  DRAFT: { label: "paychecks.draft", color: "var(--dash-teal)", bg: "rgba(0,180,166,0.1)" },
  REVIEWED: { label: "paychecks.reviewed", color: "var(--dash-warning)", bg: "rgba(245,158,11,0.1)" },
  CONFIRMED: { label: "paychecks.confirmed", color: "var(--dash-success)", bg: "rgba(34,197,94,0.1)" },
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function fmtAmount(amountStr: string) {
  const n = parseFloat(amountStr) / 100;
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Paychecks page — income events list with status badges and Review CTA */
export default function PaychecksPage() {
  const router = useRouter();
  const { hasTenant, isLoadingTenant, tenantError, incomeEventsQuery } = useDashboardData();
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);

  const events = incomeEventsQuery.data ?? [];
  const isLoading = isLoadingTenant || incomeEventsQuery.isLoading;
  const error = tenantError ?? incomeEventsQuery.error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
          {t("paychecks.title")}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
          ))}
        </div>
      ) : error ? (
        <DashboardError
          error={error}
          onRetry={() => {
            incomeEventsQuery.refetch();
            window.location.reload();
          }}
        />
      ) : !hasTenant ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-3xl">🏠</span>
          <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("setup.title")}</p>
          <button
            onClick={() => router.push("/setup")}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "var(--dash-teal)" }}
          >
            {t("setup.complete.goDashboard", { defaultValue: "Complete Setup" })}
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-3xl">💸</span>
          <p className="text-sm font-semibold" style={{ color: "var(--dash-text)" }}>{t("paychecks.noPaychecks")}</p>
          <p className="text-xs" style={{ color: "var(--dash-muted)" }}>{t("home.setupCategories")}</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--dash-border)", backgroundColor: "var(--dash-surface)" }}
        >
          {events.map((event: (typeof events)[0], i: number) => {
            const status = (event.status ?? "UPCOMING") as IncomeEventStatus;
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UPCOMING;
            const isDraftOrUpcoming = status === "DRAFT" || status === "UPCOMING";

            return (
              <div
                key={event.id}
                id={`income-event-${event.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{
                  borderBottom: i < events.length - 1 ? `1px solid var(--dash-border)` : "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--dash-text)" }}>
                    {event.expectedDate ? fmtDate(event.expectedDate) : "—"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--dash-muted)" }}>
                    {t("paychecks.expectedAmount", {
                      amount: event.expectedAmount ? fmtAmount(event.expectedAmount) : "—",
                    })}
                  </p>
                </div>

                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {t(cfg.label)}
                </span>

                {isDraftOrUpcoming && (
                  <button
                    id={`review-btn-${event.id}`}
                    onClick={() => setReviewEventId(event.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: status === "DRAFT" ? "var(--dash-teal)" : "var(--dash-navy)" }}
                  >
                    {t("home.reviewAllocation")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewEventId && (
        <AllocationReviewDrawer
          incomeEventId={reviewEventId}
          onClose={() => {
            setReviewEventId(null);
            incomeEventsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
