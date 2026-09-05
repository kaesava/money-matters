"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { DashboardError } from "../../../../components/web/DashboardError";
import { SkeletonTable } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CascadeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";
  const amountStr = searchParams.get("amount") || "0.00";
  const amount = parseFloat(amountStr);

  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewQuery = trpc.previewAllocation.useQuery(
    { incomeEventId: eventId, incomeAmount: amount },
    { enabled: !!eventId && amount > 0 }
  );

  const confirmMutation = trpc.confirmAllocation.useMutation({
    onSuccess: () => {
      router.push("/dashboard/income-and-bills");
    },
    onError: (error) => {
      setErrorMessage(error.message || "Failed to confirm allocation.");
    }
  });

  useEffect(() => {
    if (previewQuery.data) {
      const initial: Record<string, string> = {};
      for (const line of previewQuery.data) {
        initial[line.poolId] = line.proposedAmount.toFixed(2);
      }
      setCustomAmounts(initial);
    }
  }, [previewQuery.data]);

  const handleAmountChange = (pId: string, value: string) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [pId]: value,
    }));
  };

  const lines = previewQuery.data || [];

  const totalAllocated = Object.values(customAmounts).reduce((acc, val) => {
    const parsed = parseFloat(val);
    return acc + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const isDeficit = totalAllocated > amount;
  const isSurplus = totalAllocated < amount;
  const difference = Math.abs(amount - totalAllocated);

  const handleConfirm = () => {
    if (isDeficit) {
      setErrorMessage("Total allocations cannot exceed paycheck amount.");
      return;
    }
    setErrorMessage(null);
    confirmMutation.mutate({
      incomeEventId: eventId,
      incomeAmount: amount,
      lines: Object.entries(customAmounts).map(([poolId, proposedAmount]) => ({
        poolId,
        confirmedAmount: proposedAmount,
      })),
    });
  };

  if (previewQuery.isLoading) {
    return <SkeletonTable rows={5} cols={4} />;
  }

  if (previewQuery.isError) {
    return (
      <DashboardError
        message={previewQuery.error.message || "Failed to Load Allocation Preview"}
        onRetry={() => previewQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B]">{t("incomeCascade.title", { defaultValue: "Income Split" })}</h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">{t("incomeCascade.description", { defaultValue: "Review and fine-tune pool allocations for this payday." })}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">{t("incomeCascade.paycheckAmountLabel", { defaultValue: "Paycheck Amount" })}</span>
          <span className="text-xl font-black font-mono text-emerald-600">{fmt(amount)}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Allocated Total</span>
          <span className="text-lg font-bold font-mono text-[#1B2B4B] mt-1 block">{fmt(totalAllocated)}</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDeficit ? "bg-red-50 border-red-200" : isSurplus ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Remainder</span>
          <span className={`text-lg font-bold font-mono mt-1 block ${isDeficit ? "text-red-700" : isSurplus ? "text-emerald-700" : "text-zinc-700"}`}>
            {isDeficit ? `-${fmt(difference)}` : fmt(difference)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Status</span>
          <span className="text-sm font-extrabold uppercase mt-1 block text-zinc-700">
            {isDeficit ? "Over-Allocated" : isSurplus ? "Surplus to Sweeper" : "Fully Allocated"}
          </span>
        </div>
      </div>

      {/* Allocation Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600">
              <th className="px-6 py-3">Pool Name</th>
              <th className="px-6 py-3">{t("incomeCascade.reasoningHeader", { defaultValue: "Allocation Reasoning" })}</th>
              <th className="px-6 py-3 text-right">{t("incomeCascade.engineProposedHeader", { defaultValue: "Engine Proposed" })}</th>
              <th className="px-6 py-3 text-right rounded-r-lg">{t("incomeCascade.confirmedSplitHeader", { defaultValue: "Confirmed Split" })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.map((line) => {
              const currentVal = customAmounts[line.poolId] ?? line.proposedAmount.toFixed(2);
              return (
                <tr key={line.poolId} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#1B2B4B]">{line.poolName}</td>
                  <td className="px-6 py-4 text-zinc-500 max-w-xs">{line.reasoning}</td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-zinc-400">
                    {fmt(line.proposedAmount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentVal}
                      onChange={(e) => handleAmountChange(line.poolId, e.target.value)}
                      className="w-28 px-3 py-1.5 border border-zinc-300 rounded-lg text-right font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/income-and-bills")}
          className="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-bold text-sm hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={confirmMutation.isPending}
          onClick={handleConfirm}
          className="px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50"
        >
          {confirmMutation.isPending
            ? t("incomeCascade.confirmingButton", { defaultValue: "Confirming..." })
            : t("incomeCascade.confirmButton", { defaultValue: "Confirm Income Split" })}
        </button>
      </div>
    </div>
  );
}

export default function CascadePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><SkeletonTable rows={5} cols={4} /></div>}>
      <CascadeContent />
    </Suspense>
  );
}
