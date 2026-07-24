import React from "react";

interface BankAccount {
  id: string;
  name: string;
  lastKnownBalance: string;
  expectedBalance?: string;
}

interface BankReconcileCardProps {
  accounts: BankAccount[];
  fmt: (val: string | number) => string;
  onOpenSettings: () => void;
  onReconcile: (id: string, balance: string) => void;
}

export function BankReconcileCard({
  accounts,
  fmt,
  onOpenSettings,
  onReconcile,
}: BankReconcileCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1B2B4B]">Bank Balances & Reconcile</h3>
        <button
          onClick={onOpenSettings}
          className="text-xs font-bold text-[#00B4A6] hover:underline"
        >
          Settings ›
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {accounts.map((acc) => {
          const actualNum = parseFloat(acc.lastKnownBalance || "0");
          const expectedNum = parseFloat(acc.expectedBalance || "0");
          const isDiff = Math.abs(actualNum - expectedNum) >= 0.01;

          return (
            <div key={acc.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[#1B2B4B]">{acc.name}</span>
                <span className="text-[10px] text-zinc-400">Expected: {fmt(expectedNum)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[#1B2B4B]">{fmt(actualNum)}</span>
                <button
                  onClick={() => onReconcile(acc.id, acc.lastKnownBalance || "0.00")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                    isDiff ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  }`}
                >
                  {isDiff ? "Reconcile!" : "Adjust"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
