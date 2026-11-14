"use client";

import React from "react";
import { Sparkles, CheckCircle2, Lock } from "lucide-react";
import { t } from "@money-matters/i18n";
import { Button, InfoTooltip, DESIGN_TOKENS } from "@money-matters/ui/web";
import { PaydayMetricsGrid } from "./PaydayMetricsGrid";

interface PaydayCelebrationCardProps {
  everydayAllocated?: number;
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  isConfirmed: boolean;
  isLocked?: boolean;
  isDirty?: boolean;
  isFutureDate?: boolean;
  submitting: boolean;
  isDeficit?: boolean;
  strategyName?: string | null;
  onConfirm: () => void;
  onUnlockAndRecalculate?: () => void;
  onRecalculate?: () => void;
  onLockSplit?: () => void;
  onSaveChanges?: () => void;
  onDiscardEdits?: () => void;
  formatCurrency: (amount: number) => string;
}

export function PaydayCelebrationCard({
  everydayAllocated = 0,
  billsAllocated,
  goalsAllocated,
  safeToSpend,
  isConfirmed,
  isLocked = false,
  isDirty = false,
  isFutureDate = false,
  submitting,
  isDeficit = false,
  strategyName,
  onConfirm,
  onUnlockAndRecalculate,
  onRecalculate,
  onLockSplit,
  onSaveChanges,
  onDiscardEdits,
  formatCurrency,
}: PaydayCelebrationCardProps) {
  const badgeText = isConfirmed
    ? t("paydayDrawer.confirmedBadge")
    : isDirty
    ? t("paydayDrawer.customSplitsBadge")
    : isLocked
    ? t("paydayDrawer.savedBadge")
    : t("paydayDrawer.autoBadge");

  const badgeStyle = isConfirmed
    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
    : isDirty
    ? "bg-amber-500/20 border-amber-400/30 text-amber-200"
    : isLocked
    ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
    : "bg-blue-500/20 border-blue-400/30 text-blue-200";

  return (
    <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-6 sm:p-7 text-white shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeStyle}`}>
              {isConfirmed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : isLocked ? (
                <Lock className="w-3.5 h-3.5 text-indigo-300" />
              ) : isDirty ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              )}
              <span>{badgeText}</span>
            </div>
            {strategyName && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/20">
                {t("paydayDrawer.activeStrategyBadge", { name: strategyName })}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white pt-1">
            {t("paydayDrawer.celebrationTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/80 font-medium">
            {t("paydayDrawer.celebrationSubtitle")}
          </p>
        </div>

        {!isConfirmed && (
          <div className="shrink-0 flex flex-col items-end gap-2.5">
            {/* Row 1: Reset to Recommended and Confirm & Apply */}
            <div className="flex items-center gap-2.5 justify-end flex-wrap">
              {(isLocked || isDirty) && (
                <button
                  type="button"
                  onClick={onUnlockAndRecalculate || onRecalculate}
                  disabled={submitting}
                  className="bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-bold text-xs rounded-xl px-4 py-2.5 border border-white/20 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {t("paydayDrawer.resetToRecommended")}
                </button>
              )}

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onConfirm}
                  loading={submitting}
                  disabled={isDeficit || submitting || isFutureDate}
                  style={{ backgroundColor: DESIGN_TOKENS.colors.success, color: DESIGN_TOKENS.colors.surface }}
                  className="px-6 py-2.5 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/30 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{t("paydayDrawer.confirmIncomeSplit")}</span>
                </Button>
                {isFutureDate && (
                  <InfoTooltip content={t("paydayDrawer.futureConfirmDisabledTooltip")} />
                )}
              </div>
            </div>

            {/* Row 2: Discard Edits and Save Draft in this order (right aligned under Row 1) */}
            {isDirty && (
              <div className="flex items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={onDiscardEdits}
                  disabled={submitting}
                  className="text-xs font-semibold text-blue-200 hover:text-white underline cursor-pointer transition-colors px-2 py-2"
                >
                  {t("paydayDrawer.discardEdits")}
                </button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={onSaveChanges || onLockSplit}
                  disabled={isDeficit || submitting}
                  style={{ backgroundColor: DESIGN_TOKENS.colors.sereneBlue, color: DESIGN_TOKENS.colors.surface }}
                  className="px-4 py-2.5 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>{t("paydayDrawer.saveIncomeSplit")}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <PaydayMetricsGrid
        everydayAllocated={everydayAllocated}
        billsAllocated={billsAllocated}
        goalsAllocated={goalsAllocated}
        safeToSpend={safeToSpend}
        isDeficit={isDeficit}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
