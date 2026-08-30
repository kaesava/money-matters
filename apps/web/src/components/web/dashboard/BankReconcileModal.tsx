import React from "react";
import { t } from "@money-matters/i18n";

interface Category {
  id: string;
  name: string;
}

interface BankReconcileModalProps {
  reconcilingAccountId: string | null;
  onClose: () => void;
  reconcileActualAmount: string;
  setReconcileActualAmount: (val: string) => void;
  reconcileTargetCategoryId: string;
  setReconcileTargetCategoryId: (val: string) => void;
  categories: Category[];
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function BankReconcileModal({
  reconcilingAccountId,
  onClose,
  reconcileActualAmount,
  setReconcileActualAmount,
  reconcileTargetCategoryId,
  setReconcileTargetCategoryId,
  categories,
  isPending,
  onSubmit,
}: BankReconcileModalProps) {
  if (!reconcilingAccountId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1B2B4B]">{t("modals.reconciliation.title", { defaultValue: "Bank Balance Reconciliation" })}</h2>
          <button onClick={onClose} className="text-zinc-400 font-bold p-1">✕</button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Actual Bank Balance ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={reconcileActualAmount}
              onChange={(e) => setReconcileActualAmount(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target Category for Surplus (if surplus)</label>
            <select
              value={reconcileTargetCategoryId}
              onChange={(e) => setReconcileTargetCategoryId(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="">{t("modals.reconciliation.defaultSurplusCategory", { defaultValue: "Default Tenant Surplus Category" })}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md"
          >
            {isPending ? "Reconciling..." : "Confirm Reconciliation"}
          </button>
        </form>
      </div>
    </div>
  );
}
