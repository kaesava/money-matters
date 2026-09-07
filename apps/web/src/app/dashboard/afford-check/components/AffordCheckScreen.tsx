'use client';

import React, { useState, useId, useDeferredValue } from 'react';
import { trpc } from '@/lib/trpc';
import { t } from '@money-matters/i18n';
import { InfoTooltip } from '@money-matters/ui';
import { AffordCheckVerdict } from './AffordCheckVerdict';
import { AffordCheckBreakdown } from './AffordCheckBreakdown';
import { GoalDelayCard } from './GoalDelayCard';
import { AffordCheckSkeleton } from './AffordCheckSkeleton';
import { ArrowLeft, Repeat, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export function AffordCheckScreen() {
  const amountInputId = useId();
  const itemNameInputId = useId();
  const includePersonalId = useId();

  const [rawAmount, setRawAmount] = useState('');
  const [mode, setMode] = useState<'ONE_OFF' | 'RECURRING'>('ONE_OFF');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'>('MONTHLY');
  const [itemName, setItemName] = useState('');
  const [includePersonal, setIncludePersonal] = useState(false);

  // Defer amount to avoid excessive tRPC query executions while typing
  const deferredAmount = useDeferredValue(rawAmount);

  const parsedAmount = parseFloat(deferredAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading, isError, error } = trpc.canAfford.useQuery(
    {
      amount: deferredAmount,
      mode,
      frequency,
      itemName: itemName.trim() || undefined,
      includePersonal,
    },
    {
      enabled: isValidAmount,
      refetchOnWindowFocus: false,
    }
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Defensive input limits: max 12 digits, max 2 decimal places
    if (val === '' || /^\d{0,12}(\.\d{0,2})?$/.test(val)) {
      setRawAmount(val);
    }
  };

  const handleAmountBlur = () => {
    if (rawAmount !== '') {
      const num = parseFloat(rawAmount);
      if (!isNaN(num) && num > 0) {
        setRawAmount(num.toFixed(2));
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 px-4 sm:px-6 pt-4">
      {/* Top back navigation */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Header section with clean h1 + InfoTooltip */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('canIAfford.title')}
        </h1>
        <InfoTooltip content={t('canIAfford.horizonNote')} />
      </div>

      {/* Mode Selector Pill Toggle */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => setMode('ONE_OFF')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
            mode === 'ONE_OFF'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{t('canIAfford.modeOneOff')}</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('RECURRING')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
            mode === 'RECURRING'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>{t('canIAfford.modeRecurring')}</span>
        </button>
      </div>

      {/* Main Input Form Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        {/* Large Amount Display Input */}
        <div className="text-center space-y-1">
          <label htmlFor={amountInputId} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Target Amount ($)
          </label>
          <div className="relative inline-flex items-center justify-center">
            <span className="text-3xl font-bold text-slate-400 dark:text-slate-600 font-mono mr-1 select-none">
              $
            </span>
            <input
              id={amountInputId}
              type="text"
              inputMode="decimal"
              autoFocus
              value={rawAmount}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder={t('canIAfford.amountPlaceholder')}
              className="text-4xl font-extrabold font-mono tabular-nums text-center bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none py-1 w-56 text-slate-900 dark:text-slate-100 transition-colors"
            />
          </div>
        </div>

        {/* Frequency Chips (Only when mode === 'RECURRING') */}
        {mode === 'RECURRING' && (
          <div className="space-y-1.5 pt-2">
            <span className="block text-center text-xs font-medium text-slate-500">Frequency</span>
            <div className="flex flex-wrap justify-center gap-2">
              {(
                [
                  { id: 'WEEKLY', label: t('canIAfford.freqWeekly') },
                  { id: 'FORTNIGHTLY', label: t('canIAfford.freqFortnightly') },
                  { id: 'MONTHLY', label: t('canIAfford.freqMonthly') },
                  { id: 'ANNUALLY', label: t('canIAfford.freqAnnually') },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFrequency(chip.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    frequency === chip.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Optional Item Name & Personal Checkbox */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label htmlFor={itemNameInputId} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('canIAfford.itemNameLabel')}
            </label>
            <input
              id={itemNameInputId}
              type="text"
              maxLength={100}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={t('canIAfford.itemNamePlaceholder')}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center sm:justify-end">
            <label htmlFor={includePersonalId} className="inline-flex items-center gap-2 cursor-pointer pt-4 sm:pt-0">
              <input
                id={includePersonalId}
                type="checkbox"
                checked={includePersonal}
                onChange={(e) => setIncludePersonal(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('canIAfford.includePersonal')}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Query Results Section */}
      {isValidAmount && (
        <div className="space-y-4">
          {isLoading && <AffordCheckSkeleton />}

          {isError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 text-xs">
              {error.message}
            </div>
          )}

          {data && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AffordCheckVerdict data={data} />
              <AffordCheckBreakdown data={data} />
              {data.verdict === 'GOAL_DELAYED' && (
                <GoalDelayCard goalDelays={data.goalDelays} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Horizon note footer */}
      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 italic">
        {t('canIAfford.horizonNote')}
      </p>
    </div>
  );
}
