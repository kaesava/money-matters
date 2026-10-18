"use client";

import React from "react";
import { Sparkles, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { t } from "@money-matters/i18n";
import { Button, InfoTooltip } from "@money-matters/ui/web";
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
  onConfirm: () => void;
  onUnlockAndRecalculate?: () => void;
  onRecalculate?: () => void;
  onLockSplit?: () => void;
  onSaveChanges?: () => void;
  onDiscardEdits?: () => void;
  formatAUD: (amount: number) => string;
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
  onConfirm,
  onUnlockAndRecalculate,
  onRecalculate,
  onLockSplit,
  onSaveChanges,
  onDiscardEdits,
  formatAUD,
}: PaydayCelebrationCardProps) {
  const badgeTooltip = isConfirmed
    ? t("paydayDrawer.confirmedBadgeTooltip")
    : isLocked
    ? t("paydayDrawer.lockedBadgeTooltip")
    : t("paydayDrawer.autoBadgeTooltip");

  const badgeText = isConfirmed
    ? t("paydayDrawer.confirmedBadge")
    : isLocked
    ? isDirty ? t("paydayDrawer.lockedUnsavedBadge") : t("paydayDrawer.lockedBadge")
    : isDirty ? t("paydayDrawer.customSplitsBadge") : t("paydayDrawer.autoBadge");

  const badgeStyle = isConfirmed
    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
    : isDirty
    ? "bg-amber-500/20 border-amber-400/30 text-amber-200"
    : isLocked
    ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
    : "bg-blue-500/20 border-blue-400/30 text-blue-200";

  return (
    <div className="bg-gradient-to-br from-blue-900 via-[#1B2B4B] to-slate-900 border border-blue-500/30 rounded-2xl p-6 sm:p-7 text-white shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
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
            <InfoTooltip content={badgeTooltip} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white pt-1">
            {t("paydayDrawer.celebrationTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/80 font-medium">
            {t("paydayDrawer.celebrationSubtitle")}
          </p>
        </div>

        {!isConfirmed && (
          <div className="shrink-0 flex items-center gap-2.5 flex-wrap">
            {/* If Locked & Clean */}
            {isLocked && !isDirty && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onUnlockAndRecalculate}
                  disabled={submitting}
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.25)" }}
                  className="px-4 py-2.5 hover:bg-white/20 border text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                  <span>{t("paydayDrawer.unlockAndRecalculate")}</span>
                </Button>
                <InfoTooltip content={t("paydayDrawer.revertToAutoTooltip")} />
              </div>
            )}

            {/* If Locked & Dirty */}
            {isLocked && isDirty && (
              <>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onSaveChanges}
                    disabled={isDeficit || submitting}
                    style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                    className="px-4 py-2.5 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span>{t("paydayDrawer.saveChanges")}</span>
                  </Button>
                  <InfoTooltip content={t("paydayDrawer.saveChangesTooltip")} />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onDiscardEdits}
                    disabled={submitting}
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.25)" }}
                    className="px-3.5 py-2.5 hover:bg-white/20 border text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span>{t("paydayDrawer.discardEdits")}</span>
                  </Button>
                  <InfoTooltip content={t("paydayDrawer.discardEditsTooltip")} />
                </div>
              </>
            )}

            {/* If Unlocked & Clean */}
            {!isLocked && !isDirty && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onLockSplit}
                  disabled={isDeficit || submitting}
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.25)" }}
                  className="px-4 py-2.5 hover:bg-white/20 border text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>{t("paydayDrawer.lockSplit")}</span>
                </Button>
                <InfoTooltip content={t("paydayDrawer.lockSplitTooltip")} />
              </div>
            )}

            {/* If Unlocked & Dirty */}
            {!isLocked && isDirty && (
              <>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onLockSplit}
                    disabled={isDeficit || submitting}
                    style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                    className="px-4 py-2.5 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span>{t("paydayDrawer.lockSplit")}</span>
                  </Button>
                  <InfoTooltip content={t("paydayDrawer.lockSplitTooltip")} />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRecalculate}
                    disabled={submitting}
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.12)", color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.25)" }}
                    className="px-3.5 py-2.5 hover:bg-white/20 border text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span>{t("paydayDrawer.recalculate")}</span>
                  </Button>
                  <InfoTooltip content={t("paydayDrawer.recalculateTooltip")} />
                </div>
              </>
            )}

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="primary"
                onClick={onConfirm}
                loading={submitting}
                disabled={isDeficit || submitting || isFutureDate}
                style={{ backgroundColor: "#22c55e", color: "#ffffff" }}
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
        )}
      </div>

      <PaydayMetricsGrid
        everydayAllocated={everydayAllocated}
        billsAllocated={billsAllocated}
        goalsAllocated={goalsAllocated}
        safeToSpend={safeToSpend}
        isDeficit={isDeficit}
        formatAUD={formatAUD}
      />
    </div>
  );
}
