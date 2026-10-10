"use client";

import React from "react";
import { Sparkles, CheckCircle2, ShieldCheck, Target, Wallet } from "lucide-react";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

interface PaydayCelebrationCardProps {
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  isConfirmed: boolean;
  submitting: boolean;
  onConfirm: () => void;
  formatAUD: (amount: number) => string;
}

export function PaydayCelebrationCard({
  billsAllocated,
  goalsAllocated,
  safeToSpend,
  isConfirmed,
  submitting,
  onConfirm,
  formatAUD,
}: PaydayCelebrationCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-900 via-[#1B2B4B] to-slate-900 border border-blue-500/30 rounded-2xl p-6 sm:p-7 text-white shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>{isConfirmed ? t("paydayDrawer.confirmedBadge") : t("paydayDrawer.autoBadge")}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white pt-1">
            {t("paydayDrawer.celebrationTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/80 font-medium">
            {t("paydayDrawer.celebrationSubtitle")}
          </p>
        </div>

        {!isConfirmed && (
          <div className="shrink-0">
            <Button
              type="button"
              onClick={onConfirm}
              loading={submitting}
              className="px-6 py-3 bg-[#22c55e] hover:bg-emerald-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/30 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{t("paydayDrawer.confirmAndLockIn")}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 border-t border-white/10">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-blue-200/80 uppercase tracking-wider block">
              {t("paydayDrawer.ringFencedBills")}
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-white tabular-nums">
              {formatAUD(billsAllocated)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-indigo-200/80 uppercase tracking-wider block">
              {t("paydayDrawer.fundedGoals")}
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-white tabular-nums">
              {formatAUD(goalsAllocated)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-emerald-200/90 uppercase tracking-wider block">
              {t("paydayDrawer.safeToSpend")}
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-emerald-300 tabular-nums">
              {formatAUD(safeToSpend)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
