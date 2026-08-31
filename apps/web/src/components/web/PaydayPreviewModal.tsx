"use client";

import React, { useState, useEffect } from "react";
import { Spinner, useToast, Button } from "@money-matters/ui/web";
import { ModalDialog } from "./ModalDialog";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

interface PaydayPreviewModalProps {
  incomeEventId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaydayPreviewModal({
  incomeEventId,
  isOpen,
  onClose,
  onSuccess,
}: PaydayPreviewModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const pools = poolsQuery.data ?? [];

  const activeEventId = incomeEventId;
  const [actualAmount, setActualAmount] = useState<string>("0.00");
  const [sourceName, setSourceName] = useState<string>("Paycheck");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date())
  );

  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"DEPOSIT" | "ALLOCATION">("DEPOSIT");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: activeEventId || "" },
    { enabled: isOpen && !!activeEventId }
  );

  const confirmPaydayMut = trpc.confirmPayday.useMutation();

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      setSourceName(evt.name || "Paycheck");
      setActualAmount(evt.actualAmount || evt.expectedAmount);
      setSelectedDate(evt.expectedDate);

      const rawLines = (previewQuery.data.engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
      const initMap: Record<string, string> = {};
      rawLines.forEach((l: AllocationLineItem) => {
        initMap[l.bucketId] = l.proposedAmount.toFixed(2);
      });
      setLinesMap(initMap);
    }
  }, [previewQuery.data]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    setLinesMap((prev) => ({ ...prev, [bucketId]: val }));
  };

  const engineResult = previewQuery.data?.engineResult;
  const lines: AllocationLineItem[] = (engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];

  const totalAllocated = Object.values(linesMap).reduce((acc: number, val: string) => acc + (parseFloat(val) || 0), 0);
  const numericActual = parseFloat(actualAmount) || 0;
  const isFutureDate = selectedDate > todayStr;

  const everydayAllocated = lines
    .filter((l: AllocationLineItem) => pools.find((p) => p.id === l.bucketId)?.poolType === "EVERYDAY")
    .reduce((sum: number, l: AllocationLineItem) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const regularAllocated = lines
    .filter((l: AllocationLineItem) => pools.find((p) => p.id === l.bucketId)?.poolType === "REGULAR")
    .reduce((sum: number, l: AllocationLineItem) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalAllocated = lines
    .filter((l: AllocationLineItem) => pools.find((p) => p.id === l.bucketId)?.poolType === "GOAL")
    .reduce((sum: number, l: AllocationLineItem) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const validateInput = (): boolean => {
    if (!sourceName.trim()) {
      setErrorMsg("Please enter an income source name.");
      setActiveTab("DEPOSIT");
      return false;
    }
    if (isNaN(numericActual) || numericActual < 0) {
      setErrorMsg("Income amount cannot be less than 0.");
      setActiveTab("DEPOSIT");
      return false;
    }
    return true;
  };

  const handleConfirmPayday = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeEventId) {
        const payloadLines = Object.entries(linesMap).map(([bucketId, amount]) => ({
          poolId: bucketId,
          amount: (parseFloat(amount) || 0).toFixed(2),
        }));

        await confirmPaydayMut.mutateAsync({
          incomeEventId: activeEventId,
          actualAmount: totalAllocated.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
      }
      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      toast.success(t("toasts.saved"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to confirm payday allocation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Confirm Payday — ${sourceName}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs font-medium text-zinc-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab("DEPOSIT")}
            className={`px-4 py-2 font-bold border-b-2 transition-colors ${
              activeTab === "DEPOSIT"
                ? "border-[#2563eb] text-[#2563eb]"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {t("modals.paydayPreview.tabDeposit", { defaultValue: "Paycheck Deposit" })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ALLOCATION")}
            className={`px-4 py-2 font-bold border-b-2 transition-colors ${
              activeTab === "ALLOCATION"
                ? "border-[#2563eb] text-[#2563eb]"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Pool Allocations ({lines.length})
          </button>
        </div>

        {activeTab === "DEPOSIT" ? (
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.paydayPreview.incomeLabel", { defaultValue: "Income Stream Label" })}</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">Received Paycheck Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.paydayPreview.depositDate", { defaultValue: "Deposit Date" })}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
          </div>
        ) : (
          previewQuery.isLoading ? (
            <div className="p-8 text-center"><Spinner /></div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block uppercase">{t("poolTypes.everyday", { defaultValue: "Everyday" })}</span>
                  <span className="font-mono font-bold text-emerald-600">{fmt(everydayAllocated)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block uppercase">{t("poolTypes.bills", { defaultValue: "Bills" })}</span>
                  <span className="font-mono font-bold text-blue-600">{fmt(regularAllocated)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block uppercase">{t("poolTypes.goals", { defaultValue: "Goals" })}</span>
                  <span className="font-mono font-bold text-indigo-600">{fmt(goalAllocated)}</span>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {lines.map((l: AllocationLineItem) => (
                  <div key={l.bucketId} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#1B2B4B] block">{l.bucketName}</span>
                      <span className="text-[10px] text-zinc-400">{l.reasoning}</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={linesMap[l.bucketId] ?? l.proposedAmount.toFixed(2)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLineAmountChange(l.bucketId, e.target.value)}
                      className="w-24 px-2 py-1 border border-zinc-300 rounded-lg text-right font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <Button
            type="button"
            onClick={handleConfirmPayday}
            loading={submitting}
          >
            Confirm &amp; Deposit
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
