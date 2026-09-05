'use client';

import React, { useState } from 'react';
import { t } from '@money-matters/i18n';
import { Button } from '@money-matters/ui/web';

export interface BentoPoolsSectionProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  
  // Integrated Shortfall Alert Props
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;

  readonly onMoveMoney: () => void;
  
  readonly formatAUD: (val: number | string) => string;
  readonly onUpdatePoolBalance: (poolType: 'EVERYDAY' | 'REGULAR', newAmount: number) => Promise<void>;
  readonly skipConfirmation: boolean;
  readonly onSaveSkipConfirmation: () => Promise<void>;
}

export const BentoPoolsSection: React.FC<BentoPoolsSectionProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  onMoveMoney,
  formatAUD,
  onUpdatePoolBalance,
  skipConfirmation,
  onSaveSkipConfirmation,
}) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();
  const elapsedPct = (currentDay / daysInMonth) * 100;

  // Everyday pacing calculation
  const everydaySpentPct = everydayMonthlyBudget > 0 
    ? Math.min(100, Math.max(0, ((everydayMonthlyBudget - everydayBalance) / everydayMonthlyBudget) * 100))
    : 0;
  const isEverydayPacingOk = everydaySpentPct <= elapsedPct;

  // Inline edit state
  const [editingPool, setEditingPool] = useState<'EVERYDAY' | 'REGULAR' | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<{
    poolType: 'EVERYDAY' | 'REGULAR';
    oldVal: number;
    newVal: number;
    diff: number;
  } | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleEditClick = (pool: 'EVERYDAY' | 'REGULAR', currentVal: number) => {
    setEditingPool(pool);
    setEditValue(currentVal.toFixed(2));
  };

  const handleSaveClick = async (pool: 'EVERYDAY' | 'REGULAR') => {
    const newVal = parseFloat(editValue);
    if (isNaN(newVal)) {
      setEditingPool(null);
      return;
    }

    const oldVal = pool === 'EVERYDAY' ? everydayBalance : billsBalance;
    const diff = newVal - oldVal;

    if (Math.abs(diff) < 0.01) {
      setEditingPool(null);
      return;
    }

    if (skipConfirmation) {
      await onUpdatePoolBalance(pool, newVal);
      setEditingPool(null);
    } else {
      setConfirmDetails({ poolType: pool, oldVal, newVal, diff });
      setShowConfirmModal(true);
    }
  };

  const handleConfirmAdjustment = async () => {
    if (!confirmDetails || isAdjusting) return;
    setIsAdjusting(true);
    try {
      if (dontShowAgain) {
        await onSaveSkipConfirmation();
      }
      await onUpdatePoolBalance(confirmDetails.poolType, confirmDetails.newVal);
    } finally {
      setIsAdjusting(false);
      setShowConfirmModal(false);
      setConfirmDetails(null);
      setEditingPool(null);
    }
  };

  const handleCancelAdjustment = () => {
    setShowConfirmModal(false);
    setConfirmDetails(null);
    setEditingPool(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Everyday Spending Pool Card (Light Theme) */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                {t('dashboard.hero.everydayBalance') || 'Everyday Spending Pool'}
              </span>
              {editingPool !== 'EVERYDAY' ? (
                <button
                  type="button"
                  onClick={() => handleEditClick('EVERYDAY', everydayBalance)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {editingPool === 'EVERYDAY' ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-xl font-bold text-gray-800">$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-28 px-2.5 py-1 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveClick('EVERYDAY');
                    if (e.key === 'Escape') setEditingPool(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveClick('EVERYDAY')}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPool(null)}
                  className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B]">
                  {formatAUD(everydayBalance)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Discretionary spending balance
                </p>
              </div>
            )}
          </div>

          {/* Pacing Bar */}
          <div className="space-y-1.5 pt-4 mt-auto border-t border-gray-100">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Monthly Budget: {formatAUD(everydayMonthlyBudget)}</span>
              <span>{Math.round(everydaySpentPct)}% spent</span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isEverydayPacingOk ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${everydaySpentPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-blue-600 rounded-full shadow-2xs pointer-events-none"
                style={{ left: `${elapsedPct}%` }}
                title="Today"
              />
            </div>
          </div>
        </div>

        {/* Bills Pool Card (Light Theme) */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                Bills & Commitments Pool
              </span>
              {editingPool !== 'REGULAR' ? (
                <button
                  type="button"
                  onClick={() => handleEditClick('REGULAR', billsBalance)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {editingPool === 'REGULAR' ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-xl font-bold text-gray-800">$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-28 px-2.5 py-1 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveClick('REGULAR');
                    if (e.key === 'Escape') setEditingPool(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveClick('REGULAR')}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPool(null)}
                  className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B]">
                  {formatAUD(billsBalance)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ring-fenced for committed bills
                </p>
              </div>
            )}

            {/* Shortfall or Coverage Status Banner */}
            {billsShortfall > 0 ? (
              <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 block">
                      Shortfall of {formatAUD(billsShortfall)}
                    </span>
                    <span className="text-[10px] text-rose-700 block">
                      {billsDue14DaysCount} bill(s) totaling {formatAUD(totalBillsDue14Days)} due in 14 days
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onMoveMoney}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  Cover →
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                <span className="text-sm">✅</span>
                <span>Next 14 days of bills are fully covered!</span>
              </div>
            )}
          </div>

          {/* Monthly Cap Footnote */}
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 mt-auto">
            <span>Target Monthly Bills:</span>
            <span className="font-mono font-semibold">{formatAUD(billsMonthlyBudget)}</span>
          </div>
        </div>
      </div>



      {/* Pool Balance Adjustment Confirmation Modal */}
      {showConfirmModal && confirmDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900">Confirm Pool Balance Adjustment</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Adjusting the <strong>{confirmDetails.poolType === 'EVERYDAY' ? 'Everyday' : 'Bills'} Pool</strong> balance from <span className="font-mono">{formatAUD(confirmDetails.oldVal)}</span> to <span className="font-mono">{formatAUD(confirmDetails.newVal)}</span> will record an adjustment transaction of <span className="font-mono font-bold text-gray-950">{formatAUD(Math.abs(confirmDetails.diff))}</span> ({confirmDetails.diff > 0 ? 'Top-Up' : 'Spend'}) dated today.
            </p>
            
            <label className="flex items-center gap-2.5 py-1 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">Don&apos;t show this again</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelAdjustment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={handleConfirmAdjustment}
                loading={isAdjusting}
                disabled={!editValue.trim() || isNaN(parseFloat(editValue))}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BentoPoolsSection;
