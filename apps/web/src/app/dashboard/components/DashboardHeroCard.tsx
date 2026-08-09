'use client';

import React, { useState } from 'react';
import { CanAffordVerdictType } from '@money-matters/types';
import { t } from '@money-matters/i18n';
import Link from 'next/link';

export interface WebDashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly needsAttentionCount: number;
  readonly behindCount: number;
  readonly onTrackCount: number;
  readonly canAffordAmount: string;
  readonly setCanAffordAmount: (amt: string) => void;
  readonly canAffordData?: CanAffordVerdictType | null;
  readonly nextPayday?: {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    readonly expectedDate: string;
  } | null;
  readonly onPressNextPay: (eventId: string) => void;
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
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
  nextPayday,
  onPressNextPay,
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

  // Time remaining text
  let daysAwayText = '';
  if (nextPayday?.expectedDate) {
    const payDate = new Date(nextPayday.expectedDate);
    payDate.setHours(0, 0, 0, 0);
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) daysAwayText = 'Due today!';
    else if (diffDays > 0) daysAwayText = `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
    else daysAwayText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
  }

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
    if (!confirmDetails) return;
    if (dontShowAgain) {
      await onSaveSkipConfirmation();
    }
    await onUpdatePoolBalance(confirmDetails.poolType, confirmDetails.newVal);
    setShowConfirmModal(false);
    setConfirmDetails(null);
    setEditingPool(null);
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
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</span>
            {!isEditing && (
              <button
                type="button"
                onClick={() => handleEditClick(poolType, balance)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-gray-800">$</span>
              <input
                type="number"
                step="0.01"
                className="w-32 px-2.5 py-1 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
                className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingPool(null)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-3xl font-extrabold text-[#1B2B4B] font-mono tracking-tight mb-2">
              {formatAUD(balance)}
            </div>
          )}

          {/* Expected details */}
          <div className="text-xs text-gray-600 space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Expected remaining:</span>
              <span className="font-mono font-semibold">{formatAUD(expected)}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span>Status:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOver ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {isOver ? `On track (+${formatAUD(diff)})` : `Over budget (${formatAUD(Math.abs(diff))})`}
              </span>
            </div>
          </div>
        </div>

        {/* Pacing timeline visual */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span>{daysLeft} days left in {monthName}</span>
            <span>{Math.round(spentPct)}% spent</span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
            {/* Actual spent bar */}
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isSpentPacingOk ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${spentPct}%` }}
            />
            {/* Time elapsed marker pin */}
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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Scorecards */}
        <div className="flex-1 flex flex-col md:flex-row gap-6">
          {renderPoolCard('Everyday Pool', 'EVERYDAY', everydayBalance, everydayMonthlyBudget)}
          {renderPoolCard('Bills Pool', 'REGULAR', billsBalance, billsMonthlyBudget)}
        </div>

        {/* Right Side: Goals Stack (Vertically stacked) */}
        <div className="w-full lg:w-72 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Goals / Save Toward</h3>
            <div className="space-y-2">
              {/* Behind */}
              <button
                type="button"
                onClick={() => onSelectFilter?.('RED')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/90 hover:scale-[1.01] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="text-xs font-bold text-rose-950">Behind</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-200/80 text-rose-950">
                  {behindCount}
                </span>
              </button>

              {/* Needs Attention */}
              <button
                type="button"
                onClick={() => onSelectFilter?.('AMBER')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/90 hover:scale-[1.01] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-amber-950">Needs Attention</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-200/80 text-amber-950">
                  {needsAttentionCount}
                </span>
              </button>

              {/* On Track */}
              <button
                type="button"
                onClick={() => onSelectFilter?.('GREEN')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/90 hover:scale-[1.01] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">On Track</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-200/80 text-emerald-950">
                  {onTrackCount}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <Link
              href="/dashboard/categories?type=GOAL"
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              View all savings goals →
            </Link>
          </div>
        </div>
      </div>

      {/* Tools Section: Affordability & Payday */}
      <div className="p-4 lg:px-6 flex flex-col md:flex-row gap-6 border-t border-gray-100 bg-slate-50/40 rounded-2xl">
        {/* Can We Afford This? Widget */}
        <div className="flex-1 bg-white border border-slate-200/85 rounded-xl p-4 flex flex-col gap-2 shadow-2xs">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t("dashboard.quickActions.canAffordTitle")}</h3>
          <input
            type="number"
            step="0.01"
            placeholder={t("dashboard.quickActions.enterAmountPlaceholder")}
            value={canAffordAmount}
            onChange={(e) => setCanAffordAmount(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
          {canAffordData && (
            <div
              className={`p-2.5 rounded-lg text-xs font-bold ${
                canAffordData.verdict === 'YES'
                  ? 'bg-emerald-100 text-emerald-800'
                  : canAffordData.verdict === 'YES_WITH_IMPACT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {canAffordData.verdict === 'YES' && `YES! Available in Everyday (${formatAUD(canAffordData.everydayRemaining)} left)`}
              {canAffordData.verdict === 'YES_WITH_IMPACT' && `YES WITH IMPACT: Dips into ${canAffordData.affectedBucketName}`}
              {canAffordData.verdict === 'WAIT' && `WAIT: Paycheck due in ${canAffordData.daysUntilNextPaycheck} days`}
              {canAffordData.verdict === 'NO' && `NO: Shortfall of ${formatAUD(canAffordData.shortfall)}`}
            </div>
          )}
        </div>

        {/* Next Payday Row */}
        {nextPayday ? (
          <div className="flex items-center justify-between flex-1 bg-white border border-slate-200/85 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 bg-emerald-500">
                $
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Next Pay: {nextPayday.name}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {formatAUD(nextPayday.amount)} • {daysAwayText} ({nextPayday.expectedDate})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPressNextPay(nextPayday.id)}
              className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Process Pay →
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 bg-white border border-slate-200/85 rounded-xl p-4 shadow-2xs">
            <p className="text-xs text-gray-400">No upcoming payday scheduled</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                onClick={handleConfirmAdjustment}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeroCard;
