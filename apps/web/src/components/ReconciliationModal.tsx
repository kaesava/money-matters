"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { Spinner } from "@money-matters/ui/web";
import posthog from "../lib/posthog-client";


export interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedBalance: number;
  accountName: string;
  onConfirmReconcile: (actualBalance: number, absorptionMethod: "EVERYDAY" | "INCIDENTAL_BUFFER" | "UNBUDGETED_EXPENSE") => Promise<void>;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  expectedBalance,
  accountName,
  onConfirmReconcile,
}) => {
  const [actualBalanceInput, setActualBalanceInput] = useState(expectedBalance.toString());
  const [step, setStep] = useState<1 | 2>(1);
  const [absorptionMethod, setAbsorptionMethod] = useState<"EVERYDAY" | "INCIDENTAL_BUFFER" | "UNBUDGETED_EXPENSE">("EVERYDAY");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const actualNum = parseFloat(actualBalanceInput) || 0;
  const delta = Number((actualNum - expectedBalance).toFixed(2));
  const isDiscrepancy = Math.abs(delta) > 0.01;

  const handleNextOrSubmit = async () => {
    if (step === 1 && isDiscrepancy) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmReconcile(actualNum, absorptionMethod);
      posthog.capture("bank_account_reconciled", {
        has_discrepancy: isDiscrepancy,
        absorption_method: isDiscrepancy ? absorptionMethod : "none",
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-lg text-[#1B2B4B]">{t('modals.reconciliation.title')}</h3>
            <p className="text-xs text-slate-500">{accountName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600">{t('modals.reconciliation.accountBalance')}:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                ${expectedBalance.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('modals.reconciliation.actualBalance')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 font-mono font-bold text-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {isDiscrepancy && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex justify-between ${delta < 0 ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-emerald-50 text-emerald-900 border border-emerald-200"}`}>
                <span>{t('modals.reconciliation.variance')}:</span>
                <span className="font-mono font-bold">{delta > 0 ? `+$${delta}` : `-$${Math.abs(delta)}`}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
              Discrepancy of <strong className="font-mono">{delta > 0 ? `+$${delta}` : `-$${Math.abs(delta)}`}</strong> detected. Select how to absorb this difference:
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAbsorptionMethod("EVERYDAY")}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex justify-between items-center transition-all ${
                  absorptionMethod === "EVERYDAY" ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <p className="font-bold">Absorb from Everyday Pool</p>
                  <p className="text-[10px] text-slate-500">Adjusts discretionary balance to match bank.</p>
                </div>
                {absorptionMethod === "EVERYDAY" && <span className="text-blue-600 font-bold">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => setAbsorptionMethod("INCIDENTAL_BUFFER")}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex justify-between items-center transition-all ${
                  absorptionMethod === "INCIDENTAL_BUFFER" ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <p className="font-bold">Absorb from Incidental Buffer ($M)</p>
                  <p className="text-[10px] text-slate-500">Drains from unbudgeted float buffer.</p>
                </div>
                {absorptionMethod === "INCIDENTAL_BUFFER" && <span className="text-blue-600 font-bold">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => setAbsorptionMethod("UNBUDGETED_EXPENSE")}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex justify-between items-center transition-all ${
                  absorptionMethod === "UNBUDGETED_EXPENSE" ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <p className="font-bold">Log as Unbudgeted Expense</p>
                  <p className="text-[10px] text-slate-500">Creates an explicit unbudgeted ledger transaction.</p>
                </div>
                {absorptionMethod === "UNBUDGETED_EXPENSE" && <span className="text-blue-600 font-bold">✓</span>}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              ← {t('common.back')}
            </button>
          )}
          <button
            onClick={handleNextOrSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-[#1B2B4B] hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Submitting Reconciliation...</span>
              </>
            ) : step === 1 && isDiscrepancy ? (
              `${t('common.next')} →`
            ) : (
              t('modals.reconciliation.submit')
            )}
          </button>

        </div>
      </div>
    </div>
  );
};
