"use client";

import React from "react";
import { t } from "@money-matters/i18n";

interface SetupBalanceSweepModalProps {
  activeSweepPool: { id: string; name: string; balance: number } | null;
  availablePools: Array<{ id: string; name: string; isSurplusTarget?: boolean }>;
  selectedSweepDest: string;
  onSelectDest: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SetupBalanceSweepModal({
  activeSweepPool,
  availablePools,
  selectedSweepDest,
  onSelectDest,
  onCancel,
  onConfirm,
}: SetupBalanceSweepModalProps) {
  if (!activeSweepPool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
        <h3 className="text-base font-extrabold text-[#1B2B4B]">
          {t("setup.sweepModalTitle")}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("setup.sweepModalDesc", {
            poolName: activeSweepPool.name,
            balance: `$${activeSweepPool.balance.toFixed(2)}`,
          })}
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            {t("setup.sweepDestinationLabel")}
          </label>
          <select
            value={selectedSweepDest}
            onChange={(e) => onSelectDest(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          >
            {availablePools
              .filter((p) => p.id !== activeSweepPool.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isSurplusTarget ? "(Surplus Target)" : ""}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            {t("setup.sweepConfirmButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
