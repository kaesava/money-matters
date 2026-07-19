"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

export function CanWeAffordCard() {
  const [amountInput, setAmountInput] = useState("");
  const [debouncedAmount, setDebouncedAmount] = useState("");

  // Simple debounce logic to avoid query hammering
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAmount(amountInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [amountInput]);

  const cleanAmount = parseFloat(debouncedAmount);
  const isValidAmount = !isNaN(cleanAmount) && cleanAmount > 0;

  const affordQuery = trpc.canAfford.useQuery(
    { amount: cleanAmount.toFixed(2) },
    {
      enabled: isValidAmount,
      retry: false,
    }
  );

  return (
    <div className="p-6 rounded-2xl border bg-white shadow-md border-zinc-100 flex flex-col gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00B4A6]/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-300" />
      
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
          Can We Afford This?
        </h3>
        <p className="text-xs text-zinc-500">
          Enter an amount to see if everyday spending or savings surplus covers it.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xl font-extrabold text-[#1B2B4B]">$</span>
        <input
          type="number"
          placeholder="0.00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-lg font-bold text-[#1B2B4B] focus:outline-none focus:ring-2 focus:ring-[--dash-teal] transition-all"
        />
      </div>

      {isValidAmount && (
        <div className="pt-4 border-t border-zinc-100 min-h-[80px] flex items-center justify-center">
          {affordQuery.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
              <span className="w-4 h-4 border-2 border-t-transparent border-[--dash-teal] animate-spin rounded-full" />
              Calculating verdict...
            </div>
          ) : affordQuery.error ? (
            <div className="text-xs text-rose-500 font-bold">
              Failed to evaluate target.
            </div>
          ) : affordQuery.data ? (
            <VerdictResult data={affordQuery.data} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function VerdictResult({ data }: { data: any }) {
  const v = data.verdict;

  if (v === "YES") {
    return (
      <div className="w-full p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col gap-1.5 text-left">
        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
          <span className="text-base">🟢</span>
          <span>YES, YOU CAN!</span>
        </div>
        <p className="text-xs text-emerald-600 font-semibold leading-relaxed">
          This fits completely inside your everyday spending pool. You will have ${parseFloat(data.everydayRemaining).toLocaleString()} remaining.
        </p>
      </div>
    );
  }

  if (v === "YES_WITH_IMPACT") {
    return (
      <div className="w-full p-4 rounded-xl bg-amber-50 border border-amber-100 flex flex-col gap-1.5 text-left">
        <div className="flex items-center gap-1.5 text-amber-700 font-bold text-sm">
          <span className="text-base">🟡</span>
          <span>YES, WITH IMPACT</span>
        </div>
        <p className="text-xs text-amber-600 font-semibold leading-relaxed">
          Everyday spending isn't enough, but it will dip into your "{data.affectedBucketName}" savings bucket surplus by leaving a new balance of ${parseFloat(data.newBalance).toLocaleString()}.
        </p>
      </div>
    );
  }

  if (v === "WAIT") {
    return (
      <div className="w-full p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-1.5 text-left">
        <div className="flex items-center gap-1.5 text-blue-700 font-bold text-sm">
          <span className="text-base">🔵</span>
          <span>WAIT FOR PAYDAY</span>
        </div>
        <p className="text-xs text-blue-600 font-semibold leading-relaxed">
          Wait {data.daysUntilNextPaycheck} days. Your next paycheck of ${parseFloat(data.amountExpected).toLocaleString()} will cover this purchase.
        </p>
      </div>
    );
  }

  // NO
  return (
    <div className="w-full p-4 rounded-xl bg-rose-50 border border-rose-100 flex flex-col gap-1.5 text-left">
      <div className="flex items-center gap-1.5 text-rose-700 font-bold text-sm">
        <span className="text-base">🔴</span>
        <span>NO</span>
      </div>
      <p className="text-xs text-rose-600 font-semibold leading-relaxed">
        This exceeds your currently available everyday spending and savings limits by ${parseFloat(data.shortfall).toLocaleString()}.
      </p>
    </div>
  );
}
