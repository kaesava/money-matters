"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { DashboardError } from "../../../../components/web/DashboardError";
import { InfoTooltip, SkeletonTable } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

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

  const remaining = amount - totalAllocated;

  const handleConfirm = () => {
    setErrorMessage(null);
    if (Math.abs(remaining) > 0.01) {
      setErrorMessage(`Allocated sum must equal paycheck total exactly. Delta: ${fmt(remaining)}`);
      return;
    }

    const submissionLines = lines.map((line) => {
      const val = customAmounts[line.poolId] || "0.00";
      return {
        poolId: line.poolId,
        confirmedAmount: parseFloat(val).toFixed(2),
        reasoning: line.reasoning,
      };
    });

    confirmMutation.mutate({
      incomeEventId: eventId,
      incomeAmount: amount,
      lines: submissionLines,
    });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B]">{t("incomeCascade.title", { defaultValue: "Income Split" })}</h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">{t("incomeCascade.description", { defaultValue: "Review and fine-tune pool allocations for this payday." })}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">{t("incomeCascade.paycheckAmountLabel", { defaultValue: "Paycheck Amount" })}</span>
          <span className="text-2xl font-black text-[#2563eb]">{fmt(amount)}</span>
        </div>
      </div>

      {errorMessage && <DashboardError message={errorMessage} />}

      {previewQuery.isLoading ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80">
          <SkeletonTable cols={4} rows={5} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 rounded-l-lg">Pool Target</th>
                  <th className="px-6 py-3">{t("incomeCascade.reasoningHeader", { defaultValue: "Allocation Reasoning" })}</th>
                  <th className="px-6 py-3 text-right">{t("incomeCascade.engineProposedHeader", { defaultValue: "Engine Proposed" })}</th>
                  <th className="px-6 py-3 text-right rounded-r-lg">{t("incomeCascade.confirmedSplitHeader", { defaultValue: "Confirmed Split" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {lines.map((line) => {
                  const currentValue = customAmounts[line.poolId] ?? line.proposedAmount.toFixed(2);
                  return (
                    <tr key={line.poolId} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1B2B4B]">
                        {line.poolName}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <span>{line.reasoning}</span>
                          <InfoTooltip content={line.reasoning} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-zinc-500 tabular-nums">
                        {fmt(line.proposedAmount)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0.00"
                          value={currentValue}
                          onChange={(e) => handleAmountChange(line.poolId, e.target.value)}
                          className="px-3 py-1.5 border border-zinc-200 rounded-lg text-right w-28 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] font-mono font-bold"
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
