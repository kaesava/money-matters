'use client';

import React, { useEffect } from 'react';
import { CanAffordVerdictType } from '@money-matters/types';
import { t } from '@money-matters/i18n';

export interface CanAffordModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly canAffordAmount: string;
  readonly setCanAffordAmount: (amt: string) => void;
  readonly canAffordData?: CanAffordVerdictType | null;
}

export const CanAffordModal: React.FC<CanAffordModalProps> = ({
  isOpen,
  onClose,
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
}) => {
  // Support Escape key dismissal per AGENTS.md rule
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤔</span>
            <h3 className="text-lg font-extrabold text-[#1B2B4B]">
              {t('dashboard.quickActions.canAffordTitle') || 'Can We Afford This?'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Enter an amount below to test if a purchase fits within your Everyday balance without hurting upcoming bills or savings goals.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Purchase Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder={t('dashboard.quickActions.enterAmountPlaceholder') || 'Enter amount ($)'}
            value={canAffordAmount}
            onChange={(e) => setCanAffordAmount(e.target.value)}
            className="w-full px-4 py-3 text-base bg-white rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
            autoFocus
          />
        </div>

        {canAffordData && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex flex-col gap-3 transition-all ${
              canAffordData.verdict === 'SAFE_YES'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                : canAffordData.verdict === 'PACING_WARNING'
                ? 'bg-amber-50 border border-amber-200 text-amber-950'
                : canAffordData.verdict === 'IMPACT_GOALS'
                ? 'bg-orange-50 border border-orange-200 text-orange-950'
                : canAffordData.verdict === 'WAIT_FOR_PAYDAY'
                ? 'bg-blue-50 border border-blue-200 text-blue-950'
                : 'bg-rose-50 border border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-sm">
              <span>
                {canAffordData.verdict === 'SAFE_YES' && '🟢 Yes, Safe to Buy'}
                {canAffordData.verdict === 'PACING_WARNING' && '🟡 Yes, but Tight Daily Pacing'}
                {canAffordData.verdict === 'IMPACT_GOALS' && '🟠 Yes, Dips into Savings'}
                {canAffordData.verdict === 'WAIT_FOR_PAYDAY' && '🔵 Wait for Payday'}
                {canAffordData.verdict === 'HARD_NO' && '🔴 No, Do Not Buy'}
              </span>
              <span className="font-mono text-xs opacity-90">
                {canAffordData.verdict === 'SAFE_YES' && `$${canAffordData.dailyPacingAfterSpend}/day left`}
                {canAffordData.verdict === 'PACING_WARNING' && `$${canAffordData.dailyPacingAfterSpend}/day left`}
                {canAffordData.verdict === 'IMPACT_GOALS' && `$${canAffordData.goalSurplusUsed} from ${canAffordData.affectedGoalName}`}
                {canAffordData.verdict === 'WAIT_FOR_PAYDAY' && `${canAffordData.daysUntilNextPaycheck}d away`}
                {canAffordData.verdict === 'HARD_NO' && `Shortfall -$${canAffordData.shortfall}`}
              </span>
            </div>

            <div className="pt-2 border-t border-black/10 space-y-1.5 text-xs font-mono leading-relaxed">
              {canAffordData.rationaleSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="opacity-60">•</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1B2B4B] hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanAffordModal;
