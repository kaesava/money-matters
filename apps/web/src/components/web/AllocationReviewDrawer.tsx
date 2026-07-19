"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";
import { TransferInstructionsCard } from "./TransferInstructionsCard";

interface AllocationReviewDrawerProps {
  incomeEventId: string;
  onClose: () => void;
}

type PlanLine = {
  id: string;
  categoryId: string;
  categoryName: string;
  proposedAmount: string;
  confirmedAmount: string | null;
  reasoning: string | null;
};

function fmtDollars(centsStr: string | number) {
  const n = typeof centsStr === "string" ? parseFloat(centsStr) : centsStr;
  return `$${(n / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


/**
 * Allocation Review Drawer.
 * Fetches the DRAFT plan for the income event, lets user adjust amounts inline,
 * then confirms the allocation via trpc.confirmPlan.
 */
export function AllocationReviewDrawer({ incomeEventId, onClose }: AllocationReviewDrawerProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const planQuery = trpc.listAllocationPlan.useQuery({ incomeEventId });
  const executeCascade = trpc.executeCascade.useMutation({
    onSuccess: () => {
      setGenerating(false);
      planQuery.refetch();
    },
    onError: (err) => {
      setGenerating(false);
      setGenerateError(err.message);
    },
  });
  const confirmPlan = trpc.confirmPlan.useMutation({
    onSuccess: () => {
      setConfirmed(true);
    },
  });

  const plan = planQuery.data ?? null;
  const lines: PlanLine[] = plan?.lines ?? [];

  // Local state for editable amounts — initialised from proposed
  const [adjustedAmounts, setAdjustedAmounts] = useState<Record<string, string>>({});

  function getAmount(line: PlanLine): string {
    return adjustedAmounts[line.id] ?? line.proposedAmount;
  }

  function totalAllocated(): number {
    return lines.reduce((sum, line) => {
      const val = parseFloat(getAmount(line));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }

  function incomeTotal(): number {
    return plan?.totalIncomeAmount ? parseFloat(plan.totalIncomeAmount) : 0;
  }

  function handleStartEdit(line: PlanLine) {
    setEditingLineId(line.id);
    setEditValue(fmtDollars(getAmount(line)).replace("$", ""));
  }

  function handleFinishEdit(lineId: string) {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setAdjustedAmounts((prev) => ({ ...prev, [lineId]: (parsed * 100).toFixed(0) }));
    }
    setEditingLineId(null);
  }

  function handleConfirm() {
    if (!plan?.id) return;
    confirmPlan.mutate({
      planId: plan.id,
      lines: lines.map((line) => ({
        lineId: line.id,
        confirmedAmount: getAmount(line),
      })),
    });
  }

  function handleGenerate() {
    setGenerateError(null);
    setGenerating(true);
    executeCascade.mutate({
      incomeEventId,
      incomeAmount: 0, // will be resolved from the income event's expectedAmount server-side
    });
  }

  const remaining = incomeTotal() - totalAllocated();

  // Post-confirmation state
  if (confirmed) {
    return (
      <SlideOverDrawer title={t("paychecks.review.confirmed")} onClose={onClose} widthClass="max-w-lg">
        <div className="p-6 flex flex-col gap-6">
          {/* Success message */}
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(34,197,94,0.1)" }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--dash-success)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-bold" style={{ color: "var(--dash-text)" }}>
              {t("paychecks.review.confirmed")}
            </p>
            <p className="text-sm" style={{ color: "var(--dash-muted)" }}>
              {t("paychecks.review.allocationBreakdown")} — {fmtDollars(totalAllocated())} {t("paychecks.review.totalAllocated").toLowerCase()}
            </p>
          </div>
          {/* Transfer instructions */}
          <TransferInstructionsCard instructions={[]} />
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: "var(--dash-navy)" }}
          >
            {t("common.done")}
          </button>
        </div>
      </SlideOverDrawer>
    );
  }

  return (
    <SlideOverDrawer
      title={t("paychecks.review.title")}
      subtitle={plan ? fmtDollars(plan.totalIncomeAmount ?? "0") : undefined}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      <div className="flex flex-col divide-y h-full" style={{ borderColor: "var(--dash-border)" }}>

        {planQuery.isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--dash-border)" }} />
            ))}
          </div>
        ) : !plan ? (
          /* No plan exists yet — show generate button */
          <div className="p-6 flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,180,166,0.1)" }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--dash-teal)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--dash-text)" }}>
                {t("paychecks.generatePlan", { defaultValue: "No allocation plan yet" })}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--dash-muted)" }}>
                {t("paychecks.generatePlanHint", { defaultValue: "Generate your paycheck cascade recommendation." })}
              </p>
            </div>
            {generateError && (
              <p className="text-xs font-semibold" style={{ color: "var(--dash-critical)" }}>{generateError}</p>
            )}
            <button
              id="generate-plan-btn"
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--dash-teal)" }}
            >
              {generating ? t("paychecks.generating", { defaultValue: "Generating…" }) : t("paychecks.generatePlan", { defaultValue: "Generate Plan" })}
            </button>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="px-6 py-3 flex items-center justify-between gap-4" style={{ backgroundColor: "var(--dash-bg)" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                  {t("paychecks.review.totalAllocated")}
                </p>
                <p className="text-lg font-extrabold tabular-nums" style={{ color: "var(--dash-text)" }}>
                  {fmtDollars(totalAllocated())}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
                  {t("paychecks.review.remaining")}
                </p>
                <p
                  className="text-lg font-extrabold tabular-nums"
                  style={{ color: remaining >= 0 ? "var(--dash-success)" : "var(--dash-critical)" }}
                >
                  {fmtDollars(Math.abs(remaining))}
                  {remaining < 0 && " over"}
                </p>
              </div>
            </div>

            {/* Paycheck deficit soft warnings */}
            {(() => {
              const underfunded = lines.filter((line) => {
                const amt = parseFloat(getAmount(line));
                const text = (line.reasoning || "").toLowerCase();
                return (
                  text.includes("shortfall") ||
                  text.includes("deficit") ||
                  text.includes("underfunded") ||
                  text.includes("partially") ||
                  (amt === 0 && text.includes("target"))
                );
              });
              if (underfunded.length === 0) return null;
              return (
                <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">
                  <span className="text-amber-600 font-bold text-sm shrink-0">⚠️</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-bold text-amber-800">
                      Underfunded Categories Detected
                    </p>
                    <p className="text-[11px] text-amber-700 leading-normal">
                      {underfunded.length} priority categories (including {underfunded[0].categoryName}) will not be fully funded by this paycheck. You can proceed with confirmation or adjust allocations manually.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Allocation lines */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--dash-muted)" }}>
                  {t("paychecks.review.allocationBreakdown")}
                </p>
                <div className="flex flex-col gap-2">
                  {lines.map((line) => {
                    const isEditing = editingLineId === line.id;
                    const amount = getAmount(line);
                    return (
                      <div
                        key={line.id}
                        className="flex items-start gap-3 rounded-xl p-3.5"
                        style={{
                          backgroundColor: "var(--dash-surface)",
                          border: "1px solid var(--dash-border)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--dash-text)" }}>
                            {line.categoryName}
                          </p>
                          {line.reasoning && (
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--dash-muted)" }}>
                              {line.reasoning}
                            </p>
                          )}
                        </div>

                        {/* Inline edit amount */}
                        {isEditing ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-sm font-bold" style={{ color: "var(--dash-muted)" }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleFinishEdit(line.id)}
                              onKeyDown={(e) => e.key === "Enter" && handleFinishEdit(line.id)}
                              className="w-20 text-right text-sm font-bold rounded-lg px-2 py-1 focus:outline-none"
                              style={{
                                border: "1.5px solid var(--dash-teal)",
                                backgroundColor: "var(--dash-bg)",
                                color: "var(--dash-teal)",
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(line)}
                            className="text-sm font-bold tabular-nums shrink-0 px-2 py-1 rounded-lg transition-colors hover:bg-opacity-10"
                            style={{ color: "var(--dash-teal)" }}
                            title={t("paychecks.review.adjustHint")}
                          >
                            {fmtDollars(amount)}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <div className="px-6 py-4" style={{ borderTop: "1px solid var(--dash-border)" }}>
              {confirmPlan.error && (
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--dash-critical)" }}>
                  {confirmPlan.error.message}
                </p>
              )}
              <button
                id="confirm-allocation-btn"
                onClick={handleConfirm}
                disabled={confirmPlan.isPending || lines.length === 0}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: "var(--dash-teal)" }}
              >
                {confirmPlan.isPending
                  ? t("paychecks.review.confirming")
                  : t("paychecks.review.confirmCta")}
              </button>
              <p className="text-xs text-center mt-2" style={{ color: "var(--dash-muted)" }}>
                {t("paychecks.review.adjustHint")}
              </p>
            </div>
          </>
        )}
      </div>
    </SlideOverDrawer>
  );
}
