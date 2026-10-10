"use client";

import React, { useState } from "react";
import { Sparkles, ShieldCheck, Target, Wallet, ArrowRight } from "lucide-react";
import { ModalDialog, AmountField, Button } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface PaydaySandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
  estimatedBills: number;
  estimatedGoals: number;
  defaultPaycheck: number;
}

export function PaydaySandboxModal({
  isOpen,
  onClose,
  onFinish,
  estimatedBills,
  estimatedGoals,
  defaultPaycheck,
}: PaydaySandboxModalProps) {
  const [paycheckStr, setPaycheckStr] = useState(String(defaultPaycheck > 0 ? defaultPaycheck : 2500));
  const [isSimulated, setIsSimulated] = useState(false);

  const parsedPaycheck = parseFloat(paycheckStr) || 0;
  const billsAllocated = Math.min(parsedPaycheck, estimatedBills > 0 ? estimatedBills : 850);
  const goalsAllocated = Math.min(Math.max(0, parsedPaycheck - billsAllocated), estimatedGoals > 0 ? estimatedGoals : 400);
  const safeToSpend = Math.max(0, parsedPaycheck - billsAllocated - goalsAllocated);

  const formatAUD = (val: number) =>
    `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("setup.sandbox.title")}
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
          {t("setup.sandbox.subtitle")}
        </p>

        <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
          <AmountField
            label={t("setup.sandbox.paycheckAmount")}
            value={paycheckStr}
            onChange={(val) => {
              setPaycheckStr(val);
              setIsSimulated(false);
            }}
            required
            autoFocus
          />

          {!isSimulated && (
            <Button
              type="button"
              onClick={() => setIsSimulated(true)}
              disabled={parsedPaycheck <= 0}
              className="w-full py-2.5 bg-[#2563eb] text-white font-bold text-xs rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>{t("setup.sandbox.runSimulateCta")}</span>
            </Button>
          )}
        </div>

        {isSimulated && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              {t("setup.sandbox.simulatedSuccess")}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t("paydayDrawer.ringFencedBills")}</span>
                </div>
                <div className="font-mono text-base font-black text-blue-900 dark:text-blue-100">
                  {formatAUD(billsAllocated)}
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  <Target className="w-4 h-4" />
                  <span>{t("paydayDrawer.fundedGoals")}</span>
                </div>
                <div className="font-mono text-base font-black text-indigo-900 dark:text-indigo-100">
                  {formatAUD(goalsAllocated)}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <Wallet className="w-4 h-4" />
                  <span>{t("paydayDrawer.safeToSpend")}</span>
                </div>
                <div className="font-mono text-base font-black text-emerald-900 dark:text-emerald-100">
                  {formatAUD(safeToSpend)}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={onFinish}
              className="w-full py-3 bg-[#22c55e] hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <span>{t("setup.sandbox.gotItCta")}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
