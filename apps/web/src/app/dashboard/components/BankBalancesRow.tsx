'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { t } from '@money-matters/i18n';

export interface BankAccountItem {
  id: string;
  name: string;
  lastKnownBalance: string;
  expectedBalance: string;
}

export interface BankBalancesRowProps {
  readonly accounts: readonly BankAccountItem[];
  readonly onReconcile: (id: string, actualBalance: string) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const BankBalancesRow: React.FC<BankBalancesRowProps> = ({
  accounts,
  onReconcile,
  formatAUD,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (!accounts || accounts.length === 0) return null;

  const handleStartEdit = (acc: BankAccountItem) => {
    setEditingId(acc.id);
    setEditValue(parseFloat(acc.lastKnownBalance || '0').toFixed(2));
  };

  const handleSave = (id: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val)) {
      onReconcile(id, val.toFixed(2));
    }
    setEditingId(null);
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🏦</span>
          <h3 className="text-sm font-extrabold text-[#1B2B4B]">
            {t('dashboard.bankBalances.title') || 'Bank Balances'}
          </h3>
        </div>

        <Link
          href="/dashboard/bank-accounts"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {t('dashboard.bankAccountTip.action') || 'Manage Accounts →'}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const isEditing = editingId === acc.id;
          const lastBal = parseFloat(acc.lastKnownBalance || '0');
          const expBal = parseFloat(acc.expectedBalance || '0');
          const isAligned = Math.abs(lastBal - expBal) < 0.01;

          return (
            <div
              key={acc.id}
              className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800 truncate">{acc.name}</p>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="font-mono font-semibold text-gray-900">
                    {formatAUD(lastBal)}
                  </span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isAligned ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    title={isAligned ? 'In Sync' : `Expected: ${formatAUD(expBal)}`}
                  />
                </div>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg focus:outline-none font-mono"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(acc.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSave(acc.id)}
                    className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartEdit(acc)}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {t('dashboard.bankBalances.update') || 'Update'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BankBalancesRow;
