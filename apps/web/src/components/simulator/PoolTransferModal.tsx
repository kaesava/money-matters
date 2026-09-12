"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";

export interface PoolTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (transfer: {
    fromPoolId: "everyday" | "bills" | "goals" | "surplus";
    toPoolId: "everyday" | "bills" | "goals" | "surplus";
    amount: number;
  }) => void;
  initialFromPool?: "everyday" | "bills" | "goals" | "surplus";
}

type PoolType = "everyday" | "bills" | "goals" | "surplus";

const POOL_OPTIONS: { id: PoolType; label: string; icon: string }[] = [
  { id: "everyday", label: "Everyday Living", icon: "🛒" },
  { id: "bills", label: "Bills Pool", icon: "🛡️" },
  { id: "goals", label: "Committed Goals", icon: "📈" },
  { id: "surplus", label: "Surplus & Offset", icon: "💎" },
];

const PRESET_AMOUNTS = [25, 50, 100, 200];

export function PoolTransferModal({
  isOpen,
  onClose,
  onTransfer,
  initialFromPool = "everyday",
}: PoolTransferModalProps) {
  const [fromPool, setFromPool] = useState<PoolType>(initialFromPool);
  const [toPool, setToPool] = useState<PoolType>("goals");
  const [amount, setAmount] = useState<number>(50);

  useEffect(() => {
    if (isOpen) {
      setFromPool(initialFromPool);
      setToPool(initialFromPool === "goals" ? "everyday" : "goals");
    }
  }, [isOpen, initialFromPool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || fromPool === toPool) return;
    onTransfer({ fromPoolId: fromPool, toPoolId: toPool, amount });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col gap-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⇄</span>
            <h3 id="transfer-modal-title" className="text-base font-extrabold text-[#1B2B4B]">
              {t("landing.simTransferModalTitle")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">{t("landing.simTransferSource")}</label>
              <select
                value={fromPool}
                onChange={(e) => setFromPool(e.target.value as PoolType)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-[#2563eb]"
              >
                {POOL_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1">{t("landing.simTransferTarget")}</label>
              <select
                value={toPool}
                onChange={(e) => setToPool(e.target.value as PoolType)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-[#2563eb]"
              >
                {POOL_OPTIONS.filter((p) => p.id !== fromPool).map((p) => (
                  <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-500">{t("landing.simTransferAmount")}</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-sm">$</span>
              <input
                type="number"
                min={5}
                max={500}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="flex-1 p-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                    amount === amt ? "bg-[#2563eb] text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold"
            >
              {t("landing.simTransferCancel")}
            </button>
            <button
              type="submit"
              disabled={amount <= 0 || fromPool === toPool}
              className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {t("landing.simTransferConfirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
