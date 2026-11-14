'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { FormLabel } from './FormLabel';
import { Input } from './Input';
import { AmountField } from './fields/AmountField';
import { ContributionMode } from '../lib/householdContribution';

export interface HouseholdContributionSectionProps {
  hasPrivateEnvelopes: boolean;
  contributionMode: ContributionMode;
  onContributionModeChange: (mode: ContributionMode) => void;
  contributionValue: string;
  onContributionValueChange: (val: string) => void;
  currency?: string;
  currencySymbol?: string;
  minorUnits?: number;
}

const CONTRIBUTION_MODES: Array<{ mode: ContributionMode; labelKey: string }> = [
  { mode: 'FULL', labelKey: 'planTabs.householdContribution.full' },
  { mode: 'PERCENTAGE', labelKey: 'planTabs.householdContribution.percentage' },
  { mode: 'FIXED_AMOUNT', labelKey: 'planTabs.householdContribution.fixedAmount' },
];

export function HouseholdContributionSection({
  hasPrivateEnvelopes,
  contributionMode,
  onContributionModeChange,
  contributionValue,
  onContributionValueChange,
  currency,
  currencySymbol,
  minorUnits,
}: HouseholdContributionSectionProps) {
  if (!hasPrivateEnvelopes) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200 dark:border-slate-700/60">
      <FormLabel>{t('planTabs.householdContribution.title')}</FormLabel>
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[11px]">
        {CONTRIBUTION_MODES.map(({ mode, labelKey }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onContributionModeChange(mode)}
            className={`py-1.5 px-2 rounded font-medium transition-colors ${
              contributionMode === mode
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {contributionMode === 'PERCENTAGE' && (
        <div className="pt-2">
          <Input
            label={t('planTabs.householdContribution.modeLabel')}
            type="number"
            min={1}
            max={100}
            value={contributionValue}
            onChange={(e) => onContributionValueChange(e.target.value)}
            placeholder={t('planTabs.householdContribution.percentagePlaceholder')}
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
            {t('planTabs.householdContribution.remainderNote')}
          </p>
        </div>
      )}

      {contributionMode === 'FIXED_AMOUNT' && (
        <div className="pt-2">
          <AmountField
            label={t('planTabs.householdContribution.modeLabel')}
            value={contributionValue}
            onChange={onContributionValueChange}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
            {t('planTabs.householdContribution.remainderNote')}
          </p>
        </div>
      )}
    </div>
  );
}
