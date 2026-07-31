"use client";

import React, { useState } from "react";

interface ReconciliationModalProps {
  isOpen: boolean;
  expectedBalance: string;
  accountName: string;
  onClose: () => void;
  onReconcile: (actualBalance: string, discrepancy: number) => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  expectedBalance,
  accountName,
  onClose,
  onReconcile,
}) => {
  const [actualBalanceInput, setActualBalanceInput] = useState(expectedBalance);
  const [step, setStep] = useState<"INPUT" | "MATCH" | "DISCREPANCY">("INPUT");

  if (!isOpen) return null;

  const expectedNum = parseFloat(expectedBalance) || 0;
  const actualNum = parseFloat(actualBalanceInput) || 0;
  const discrepancy = actualNum - expectedNum;
  const isExactMatch = Math.abs(discrepancy) < 0.01;

  const handleVerify = () => {
    if (isExactMatch) {
      setStep("MATCH");
    } else {
      setStep("DISCREPANCY");
    }
  };

  const handleConfirmDiscrepancyAdjustment = () => {
    onReconcile(actualBalanceInput, discrepancy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900">One-Tap Bank Reconciliation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Account: <strong className="text-slate-700">{accountName}</strong>
          </p>

          {step === "INPUT" && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Expected System Balance</span>
                <span className="text-2xl font-bold font-mono text-slate-900">${expectedBalance}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  What does your actual bank app show right now?
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={actualBalanceInput}
                    onChange={(e) => setActualBalanceInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleVerify}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors"
              >
                Verify Balance
              </button>
            </div>
          )}

          {step === "MATCH" && (
            <div className="text-center py-4 space-y-3">
              <span className="text-4xl">🎉</span>
              <h4 className="text-lg font-bold text-emerald-600">Perfect Match!</h4>
              <p className="text-xs text-slate-600">
                Your bank balance perfectly matches your budget system (${actualBalanceInput}).
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm"
              >
                Done
              </button>
            </div>
          )}

          {step === "DISCREPANCY" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 text-xs">
                <p className="font-bold text-sm mb-1">Discrepancy of {discrepancy > 0 ? `+$${discrepancy.toFixed(2)}` : `-$${Math.abs(discrepancy).toFixed(2)}`}</p>
                <p>
                  Would you like us to automatically adjust your Everyday Pool to align with your actual bank balance?
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("INPUT")}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600"
                >
                  Re-enter
                </button>
                <button
                  onClick={handleConfirmDiscrepancyAdjustment}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Auto-Adjust Everyday
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
