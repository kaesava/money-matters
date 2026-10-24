'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { AmountField } from '@money-matters/ui/web';

export interface AffordCheckInlineCardProps {
  readonly onCheck: (amount: string) => void;
}

export const AffordCheckInlineCard: React.FC<AffordCheckInlineCardProps> = ({ onCheck }) => {
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) > 0) {
      onCheck(amount);
      setAmount('');
    }
  };

  return (
    <div
      data-tour="afford-check"
      className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-zinc-900/60 dark:to-zinc-800/40 border border-blue-200/70 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#1B2B4B] dark:text-zinc-100">
            {t('canIAfford.title')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {t('canIAfford.quickCheckSubtext')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full sm:w-auto">
        <div className="w-32 sm:w-36">
          <AmountField
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            required
          />
        </div>
        <button
          type="submit"
          disabled={!amount || parseFloat(amount) <= 0}
          className="px-3.5 py-2.5 h-10 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{t('canIAfford.actionCheck')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
