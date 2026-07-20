"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { DashboardError } from "../../../../components/web/DashboardError";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CascadePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";
  const amountStr = searchParams.get("amount") || "0.00";
  const amount = parseFloat(amountStr);

  const previewQuery = trpc.previewAllocation.useQuery(
    { incomeEventId: eventId, incomeAmount: amount },
    { enabled: !!eventId && amount > 0 }
  );

  const confirmMutation = trpc.confirmAllocation.useMutation({
    onSuccess: () => {
      router.push("/dashboard/paychecks");
    },
  });

  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize custom amounts when preview data loads
  useEffect(() => {
    if (previewQuery.data) {
      const initial: Record<string, string> = {};
      for (const line of previewQuery.data) {
        initial[line.categoryId] = line.proposedAmount.toFixed(2);
      }
      setCustomAmounts(initial);
    }
  }, [previewQuery.data]);

  const handleAmountChange = (catId: string, value: string) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [catId]: value,
    }));
  };

  const lines = previewQuery.data || [];

  // Compute live sum of custom allocations
  const totalAllocated = Object.values(customAmounts).reduce((acc, val) => {
    const parsed = parseFloat(val);
    return acc + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const remaining = amount - totalAllocated;

  const handleConfirm = async () => {
    setErrorMessage(null);
    if (Math.abs(remaining) > 0.01) {
      setErrorMessage(`Allocated sum must equal paycheck total exactly. Delta: ${fmt(remaining)}`);
      return;
    }

    const submissionLines = lines.map((line) => {
      const val = customAmounts[line.categoryId] || "0.00";
      return {
        categoryId: line.categoryId,
        confirmedAmount: parseFloat(val).toFixed(2),
        reasoning: line.reasoning,
      };
    });

    try {
      await confirmMutation.mutateAsync({
        incomeEventId: eventId,
        incomeAmount: amount,
        lines: submissionLines,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to confirm allocation.");
    }
  };

  if (!eventId || amount <= 0) {
    return (
      <div className="p-8 text-center text-sm font-semibold text-zinc-500">
        Invalid paycheck parameters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          Cascade Allocation Override
        </h1>
        <p className="text-sm font-semibold text-zinc-500 mt-1">
          Review and override the paycheck waterfall cascade before confirming.
        </p>
      </div>

      {/* Calculator Bar */}
      <div className="p-5 rounded-2xl bg-[#1B2B4B] text-white flex flex-wrap gap-6 items-center justify-between shadow-md">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Paycheck</span>
          <span className="text-2xl font-black">{fmt(amount)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Allocated</span>
          <span className="text-2xl font-black text-[#00B4A6]">{fmt(totalAllocated)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Remaining Unallocated</span>
          <span className={`text-2xl font-black ${Math.abs(remaining) > 0.01 ? "text-amber-400" : "text-emerald-400"}`}>
            {fmt(remaining)}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold border border-rose-100">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Grid of Split lines */}
      {previewQuery.isLoading ? (
        <div className="h-64 rounded-2xl animate-pulse bg-zinc-200/50" />
      ) : previewQuery.error ? (
        <DashboardError error={previewQuery.error} onRetry={() => previewQuery.refetch()} />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Current Balance</th>
                  <th className="px-6 py-4">Target / Limit</th>
                  <th className="px-6 py-4">% Complete</th>
                  <th className="px-6 py-4">Proposed Split</th>
                  <th className="px-6 py-4 text-right">Confirm Split ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {lines.map((line) => {
                  const currentValue = customAmounts[line.categoryId] ?? "0.00";
                  return (
                    <tr key={line.categoryId} className="hover:bg-zinc-50/50 transition-colors text-sm">
                      <td className="px-6 py-4 font-bold text-[#1B2B4B]">
                        {line.categoryName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {line.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {fmt(line.currentBalance)}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {line.targetAmount ? fmt(line.targetAmount) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-zinc-500">{line.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-500">
                        {fmt(line.proposedAmount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0.00"
                          value={currentValue}
                          onChange={(e) => handleAmountChange(line.categoryId, e.target.value)}
                          className="px-3 py-1.5 border border-zinc-200 rounded-lg text-right w-28 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4A6] font-mono font-bold"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action triggers */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push("/dashboard/paychecks")}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirmMutation.isPending || previewQuery.isLoading}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-md"
        >
          {confirmMutation.isPending ? "Confirming..." : "Confirm & Save Splits"}
        </button>
      </div>
    </div>
  );
}
