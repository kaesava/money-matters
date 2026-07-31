import React from 'react';

export interface StatCardProps {
  title: string;
  accountNumber?: string;
  balance: number | string;
  icon?: string;
  variant?: 'primary' | 'surface';
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  accountNumber,
  balance,
  icon = "account_balance_wallet",
  variant = 'surface',
  subtitle,
}) => {
  const formattedBalance = typeof balance === 'number' 
    ? `$${balance.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : balance.startsWith('$') ? balance : `$${balance}`;

  if (variant === 'primary') {
    return (
      <div className="bg-[#1B2B4B] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</p>
            {accountNumber && <p className="font-mono text-xs text-slate-400 mt-1">**** {accountNumber}</p>}
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="mt-6">
          <p className="font-mono text-3xl font-extrabold tracking-tight">{formattedBalance}</p>
          {subtitle && <p className="text-xs text-slate-300 mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          {accountNumber && <p className="font-mono text-xs text-slate-400 mt-1">**** {accountNumber}</p>}
        </div>
        <span className="text-2xl text-blue-600">{icon}</span>
      </div>
      <div className="mt-6">
        <p className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">{formattedBalance}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
