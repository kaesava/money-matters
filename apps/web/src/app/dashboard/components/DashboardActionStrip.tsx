'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Plus, ChevronDown, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Sparkles, Bot } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { InfoTooltip } from '@money-matters/ui/web';

export interface DashboardActionStripProps {
  readonly onOpenQuickExpense: () => void;
  readonly onOpenQuickIncome: () => void;
  readonly onOpenMoveMoney: () => void;
  readonly onOpenAffordCheck: () => void;
  readonly onOpenAskPenny: () => void;
}

export const DashboardActionStrip: React.FC<DashboardActionStripProps> = ({
  onOpenQuickExpense,
  onOpenQuickIncome,
  onOpenMoveMoney,
  onOpenAffordCheck,
  onOpenAskPenny,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/60 dark:border-zinc-800/80">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-[#1B2B4B] dark:text-zinc-50 tracking-tight">
            {t('nav.dashboard')}
          </h1>
          <InfoTooltip
            title={t('tooltips.dashboard.title')}
            content={t('tooltips.dashboard.content')}
          />
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          {t('app.tagline')}
        </p>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
        <div className="relative" ref={menuRef}>
          <div className="inline-flex items-center rounded-xl shadow-xs overflow-hidden border border-blue-600 bg-[#2563eb]">
            <button
              type="button"
              onClick={onOpenQuickExpense}
              className="px-3.5 py-2 h-9 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>{t('dashboard.quickAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="px-2.5 py-2 h-9 bg-[#2563eb] hover:bg-[#1d4ed8] border-l border-blue-400/50 text-white transition-colors flex items-center justify-center cursor-pointer"
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-label={t('dashboard.quickAction')}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {isOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onOpenQuickExpense();
                  setIsOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
                <span>{t('dashboard.recordExpense')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenQuickIncome();
                  setIsOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:text-emerald-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <span>{t('dashboard.recordIncome')}</span>
              </button>
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                type="button"
                onClick={() => {
                  onOpenMoveMoney();
                  setIsOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                <span>{t('dashboard.transferBetweenPools')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenAskPenny();
                  setIsOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-purple-50 dark:hover:bg-zinc-800 hover:text-purple-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-purple-500" />
                <span>{t('assistant.trigger')}</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAffordCheck}
          className="px-3.5 py-2 h-9 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80 border border-slate-300/80 dark:border-zinc-700 text-[#1B2B4B] dark:text-zinc-100 font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
          <span>{t('canIAfford.title')}</span>
        </button>
      </div>
    </div>
  );
};
