'use client';

import React, { useState } from 'react';
import { t } from '@money-matters/i18n';
import { CanAffordVerdictType } from '@money-matters/types';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface AffordCheckBreakdownProps {
  data: CanAffordVerdictType;
}

export function AffordCheckBreakdown({ data }: AffordCheckBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isOpen ? t('canIAfford.hideBreakdown') : t('canIAfford.seeBreakdown')}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {/* BILLS_RISK itemised bills */}
          {data.verdict === 'BILLS_RISK' && data.billsDueItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('canIAfford.billsBeforePayday')}
              </h4>
              <div className="space-y-1.5">
                {data.billsDueItems.map((bill, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{bill.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{bill.dueDate}</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        ${bill.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rationale calculation steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Calculation Steps
            </h4>
            <ul className="space-y-1.5 font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              {data.rationaleSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 select-none">›</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
