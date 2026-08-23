'use client';

import React, { useState } from 'react';
import { t } from '@money-matters/i18n';
import Link from 'next/link';
import { Spinner } from '@money-matters/ui/web';
import DonutRing from '../../../components/web/DonutRing';

export interface WebDashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly needsAttentionCount: number;
  readonly behindCount: number;
  readonly onTrackCount: number;
  readonly onOpenCanAfford?: () => void;
  readonly onSelectFilter?: (health: string) => void;
  readonly formatAUD: (val: number | string) => string;
  readonly onUpdatePoolBalance: (poolType: 'EVERYDAY' | 'REGULAR', newAmount: number) => Promise<void>;
  readonly skipConfirmation: boolean;
  readonly onSaveSkipConfirmation: () => Promise<void>;
}

export const DashboardHeroCard: React.FC<WebDashboardHeroCardProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  needsAttentionCount,
  behindCount,
  onTrackCount,
  onOpenCanAfford,
  onSelectFilter,
  formatAUD,
  onUpdatePoolBalance,
  skipConfirmation,
  onSaveSkipConfirmation,
}) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleString('default', { month: 'short' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();
  const daysLeft = daysInMonth - currentDay;
  const elapsedPct = (currentDay / daysInMonth) * 100;

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

  const [isAdjusting, setIsAdjusting] = useState(false);

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

  // Helper to render pacing progress card
  const renderPoolCard = (
    title: string,
    poolType: 'EVERYDAY' | 'REGULAR',
    balance: number,
    budget: number
  ) => {
    const isEditing = editingPool === poolType;
    const expected = budget * (1 - currentDay / daysInMonth);
    const diff = balance - expected;
    const isOver = diff >= 0;
    
    // Pacing spent percentage
    const spentPct = budget > 0 ? Math.min(100, Math.max(0, ((budget - balance) / budget) * 105)) : 0;
    const isSpentPacingOk = spentPct <= elapsedPct;

    return (
      <div className="flex-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</span>
            {!isEditing && (
              <button
                type="button"
                onClick={() => handleEditClick(poolType, balance)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-lg font-bold text-gray-800">$</span>
              <input
                type="number"
                step="0.01"
                className="w-28 px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveClick(poolType);
                  if (e.key === 'Escape') setEditingPool(null);
                }}
              />
              <button
                type="button"
                onClick={() => handleSaveClick(poolType)}
                className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingPool(null)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="text-2xl font-extrabold text-[#1B2B4B] font-mono tracking-tight mb-1 tabular-nums">
              {formatAUD(balance)}
            </div>
          )}

          {/* Expected details */}
          <div className="text-xs text-gray-600 space-y-1 mb-3">
            <div className="flex justify-between items-center">
              <span>Expected remaining:</span>
              <span className="font-mono font-semibold">{formatAUD(expected)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOver ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isOver ? `On track (+${formatAUD(diff)})` : `Over budget (${formatAUD(Math.abs(diff))})`}
              </span>
            </div>
          </div>
        </div>

        {/* Pacing timeline visual */}
        <div className="space-y-1 mt-auto">
          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span>{daysLeft}d left in {monthName}</span>
            <span>{Math.round(spentPct)}% spent</span>
          </div>
          <div className="relative h-2 bg-gray-200/80 rounded-full overflow-visible">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isSpentPacingOk ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${spentPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-blue-600 rounded-full shadow-xs pointer-events-none"
              style={{ left: `${elapsedPct}%` }}
              title="Today"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-6 shadow-xs space-y-6">
      {/* Upper Hero Row: Ring + Main Balance & Pool Cards */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Ring Visual & Hero Balance */}
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
          <div className="relative flex items-center justify-center shrink-0">
            <DonutRing
              timeElapsedPct={elapsedPct}
              consumedPct={everydayMonthlyBudget > 0 ? Math.min(100, Math.max(0, ((everydayMonthlyBudget - everydayBalance) / everydayMonthlyBudget) * 100)) : 0}
              centerLabel={formatAUD(everydayBalance)}
              size={200}
              strokeWidth={16}
            />
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest block">
              {t('dashboard.hero.everydayBalance') || 'Left to Spend'}
            </span>
            <h2 className="text-4xl font-extrabold text-[#1B2B4B] font-mono tabular-nums tracking-tight">
              {formatAUD(everydayBalance)}
            </h2>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>{daysLeft} days remaining in {monthName}</p>
              <p className="font-medium text-blue-600">
                Monthly Cap: <span className="font-mono font-semibold">{formatAUD(everydayMonthlyBudget)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dual Pool Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:max-w-xl">
          {renderPoolCard('Everyday Pool', 'EVERYDAY', everydayBalance, everydayMonthlyBudget)}
          {renderPoolCard('Bills Pool', 'REGULAR', billsBalance, billsMonthlyBudget)}
        </div>
      </div>

      {/* Hero Action & Health Status Footer Strip */}
      <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Health Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Category Health:
          </span>
          <button
            type="button"
            onClick={() => onSelectFilter?.('RED')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors text-xs font-bold text-rose-800 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span>Behind ({behindCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter?.('AMBER')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-xs font-bold text-amber-800 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Attention ({needsAttentionCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter?.('GREEN')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors text-xs font-bold text-emerald-800 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>On Track ({onTrackCount})</span>
          </button>

          <Link
            href="/dashboard/categories"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 ml-1"
          >
            View Pools →
          </Link>
        </div>

        {/* Can We Afford This? Hero Button */}
        {onOpenCanAfford && (
          <button
            type="button"
            onClick={onOpenCanAfford}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors cursor-pointer shrink-0"
          >
            <span>🤔 Can We Afford This?</span>
            <span>→</span>
          </button>
        )}
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
              <button
                type="button"
                disabled={isAdjusting}
                onClick={handleConfirmAdjustment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:opacity-75 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isAdjusting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeroCard;
