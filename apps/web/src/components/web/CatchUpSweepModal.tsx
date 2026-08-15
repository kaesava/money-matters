"use client";

import React, { useState, useEffect } from "react";
const formatAUD = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(num);
};

export interface CatchUpSweepModalProps {
  readonly leftoverEverydayBalance: number;
  readonly surplusTargetName: string;
  readonly onSweep: () => Promise<void>;
  readonly onKeepInEveryday: () => void;
}

export const CatchUpSweepModal: React.FC<CatchUpSweepModalProps> = ({
  leftoverEverydayBalance,
  surplusTargetName,
  onSweep,
  onKeepInEveryday,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check month boundary trigger
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
      const lastSweepMonth = localStorage.getItem("last_catchup_sweep_month");

      if (leftoverEverydayBalance > 10 && lastSweepMonth !== currentMonthKey) {
        setIsOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [leftoverEverydayBalance]);

  if (!isOpen) return null;

  const markHandled = () => {
    try {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
      localStorage.setItem("last_catchup_sweep_month", currentMonthKey);
    } catch {
      // Ignore
    }
    setIsOpen(false);
  };

  const handleSweepClick = async () => {
    setIsSubmitting(true);
    try {
      await onSweep();
      markHandled();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepClick = () => {
    onKeepInEveryday();
    markHandled();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-zinc-100 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-2xl flex items-center justify-center">
            🧹
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-full">
              New Month Catch-Up
            </span>
            <h3 className="text-lg font-black text-[#1B2B4B]">Leftover Everyday Funds</h3>
          </div>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          You have <span className="font-mono font-extrabold text-[#1B2B4B]">{formatAUD(leftoverEverydayBalance)}</span> leftover from last month&apos;s Everyday spending pool.
        </p>

        <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-zinc-500">Designated Surplus Goal:</span>
            <span className="font-bold text-[#1B2B4B]">{surplusTargetName}</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Sweeping helps lock in your savings progress automatically at the start of a new month.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleSweepClick}
            disabled={isSubmitting}
            className="w-full py-3 text-xs font-extrabold text-white bg-[#2563eb] hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Sweeping..." : `Sweep ${formatAUD(leftoverEverydayBalance)} to ${surplusTargetName} →`}
          </button>
          <button
            type="button"
            onClick={handleKeepClick}
            disabled={isSubmitting}
            className="w-full py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Keep in Everyday Spending
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatchUpSweepModal;
