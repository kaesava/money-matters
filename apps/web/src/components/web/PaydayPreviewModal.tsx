"use client";

import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { Spinner, InfoTooltip } from "@money-matters/ui/web";
import { PaydayReasonModal } from "./upcoming/PaydayReasonModal";
import { PaydayDepositTab } from "./upcoming/PaydayDepositTab";
import { PaydayWaterfallTab } from "./upcoming/PaydayWaterfallTab";

export interface UpcomingIncomeItem {
  id?: string;
  sourceName?: string;
  expectedDate?: string;
  expectedAmount?: string;
  receivingAccountId?: string | null;
  note?: string | null;
  isRecurring?: boolean;
}

interface PaydayPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeEventId?: string | null;
  eventToEdit?: UpcomingIncomeItem | null;
  isQuickAdd?: boolean;
  onSuccess?: () => void;
}

interface PaydayLine {
  bucketId: string;
  bucketName: string;
  reasoning: string;
  proposedAmount: number;
}

export default function PaydayPreviewModal({
  isOpen,
  onClose,
  incomeEventId,
  eventToEdit,
  isQuickAdd: _isQuickAdd = false,
  onSuccess,
}: PaydayPreviewModalProps) {
  const utils = trpc.useUtils();
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeEventId = incomeEventId || eventToEdit?.id || null;

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: isOpen });

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const [activeTab, setActiveTab] = useState<"DEPOSIT" | "WATERFALL">("WATERFALL");

  const [sourceName, setSourceName] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [note, setNote] = useState("");
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [reasonModal, setReasonModal] = useState<{ open: boolean; cat: string; reason: string }>({
    open: false,
    cat: "",
    reason: "",
  });

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: activeEventId! },
    { enabled: !!activeEventId && isOpen }
  );

  const previewData = previewQuery.data as { incomeEvent: { name?: string; actualAmount?: string; expectedDate?: string }; engineResult: { lines: PaydayLine[] } } | undefined;
  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideMut = trpc.overrideEvent.useMutation();
  const deleteMut = trpc.deleteUpcomingEvent.useMutation();
  const createUpcomingMut = trpc.createUpcomingIncome.useMutation();

  useEffect(() => {
    const currentTodayStr = new Date().toISOString().slice(0, 10);
    if (previewData) {
      setSourceName(previewData.incomeEvent?.name || eventToEdit?.sourceName || "Paycheck");
      setActualAmount(previewData.incomeEvent.actualAmount || eventToEdit?.expectedAmount || "0.00");
      const rawDate = previewData.incomeEvent.expectedDate || eventToEdit?.expectedDate;
      setSelectedDate(rawDate ? new Date(rawDate).toISOString().slice(0, 10) : currentTodayStr);
      setNote(eventToEdit?.note || "");
      setReceivingAccountId(eventToEdit?.receivingAccountId || bankAccounts[0]?.id || "");

      const initial: Record<string, string> = {};
      for (const line of previewData.engineResult.lines) {
        initial[line.bucketId] = line.proposedAmount.toFixed(2);
      }
      setLinesMap(initial);
    } else {
      setSourceName(eventToEdit?.sourceName || "");
      setActualAmount(eventToEdit?.expectedAmount || "");
      setSelectedDate(eventToEdit?.expectedDate || currentTodayStr);
      setNote(eventToEdit?.note || "");
      setReceivingAccountId(eventToEdit?.receivingAccountId || bankAccounts[0]?.id || "");
    }
  }, [previewData, eventToEdit, isOpen, bankAccounts]);

  if (!isOpen) return null;

  const lines = previewData?.engineResult.lines || [];
  const totalAllocated = Object.values(linesMap).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  const numericActual = parseFloat(actualAmount) || 0;
  const isFutureDate = selectedDate > todayStr;

  const everydayAllocated = lines
    .filter((l) => categories.find((c) => c.id === l.bucketId)?.type === "EVERYDAY")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const regularAllocated = lines
    .filter((l) => categories.find((c) => c.id === l.bucketId)?.type === "REGULAR")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalAllocated = lines
    .filter((l) => categories.find((c) => c.id === l.bucketId)?.type === "GOAL")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

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

  const handleSaveWithoutMarkingPaid = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeEventId) {
        await overrideMut.mutateAsync({
          eventId: activeEventId,
          eventType: "INCOME",
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          note,
        });
      } else {
        await createUpcomingMut.mutateAsync({
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
      }
      await utils.listIncomeEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save upcoming income event.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayday = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeEventId) {
        const payloadLines = Object.entries(linesMap).map(([bucketId, amount]) => ({
          bucketId,
          amount: (parseFloat(amount) || 0).toFixed(2),
        }));

        await confirmPaydayMut.mutateAsync({
          incomeEventId: activeEventId,
          actualAmount: totalAllocated.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
      } else {
        await createUpcomingMut.mutateAsync({
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
      }

      posthog.capture("payday_processed", {
        source_name: sourceName,
        actual_amount: numericActual,
        is_future_date: isFutureDate,
      });

      await utils.listIncomeEvents.invalidate();
      await utils.getMonthlySummary.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process payday execution.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeEventId) return;
    if (!confirm("Are you sure you want to delete this upcoming income deposit?")) return;
    setSubmitting(true);
    try {
      await deleteMut.mutateAsync({ eventId: activeEventId, eventType: "INCOME" });
      await utils.listIncomeEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete income event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Slide-over Drawer Overlay */}
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
        <div className="relative w-full max-w-xl h-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <div>
              <h3 className="text-base font-bold text-[#1B2B4B] dark:text-white">
                {activeEventId ? "Execute Payday Split Plan" : "Log New Income Deposit"}
              </h3>
              <a
                href="/dashboard/income-and-bills?tab=setup"
                className="text-xs text-[#2563eb] hover:underline font-bold mt-0.5 inline-block"
              >
                ⚙️ Edit recurring rule in Setup
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

          {/* TAB HEADER */}
          <div className="flex border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveTab("WATERFALL")}
              className={`py-2 px-4 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "WATERFALL"
                  ? "border-[#00B4A6] text-[#00B4A6]"
                  : "border-transparent text-zinc-500 hover:text-[#1B2B4B]"
              }`}
            >
              🌊 5-Step Waterfall Split
              <InfoTooltip content="Automated payday allocation engine routing funds across your bill reserves & savings pools." />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DEPOSIT")}
              className={`py-2 px-4 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "DEPOSIT"
                  ? "border-[#00B4A6] text-[#00B4A6]"
                  : "border-transparent text-zinc-500 hover:text-[#1B2B4B]"
              }`}
            >
              💵 Deposit Details
              <InfoTooltip content="Source name, actual received amount, deposit date, and destination account." />
            </button>
          </div>

          {activeTab === "DEPOSIT" && (
            <PaydayDepositTab
              sourceName={sourceName}
              setSourceName={setSourceName}
              actualAmount={actualAmount}
              setActualAmount={setActualAmount}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              receivingAccountId={receivingAccountId}
              setReceivingAccountId={setReceivingAccountId}
              bankAccounts={bankAccounts}
              note={note}
              setNote={setNote}
              activeEventId={activeEventId}
              submitting={submitting}
              onDelete={handleDelete}
              onSaveWithoutMarkingPaid={handleSaveWithoutMarkingPaid}
            />
          )}

          {activeTab === "WATERFALL" && (
            <PaydayWaterfallTab
              everydayAllocated={everydayAllocated}
              regularAllocated={regularAllocated}
              goalAllocated={goalAllocated}
              totalAllocated={totalAllocated}
              numericActual={numericActual}
              lines={lines}
              linesMap={linesMap}
              setLinesMap={setLinesMap}
              categories={categories}
              onShowReasoning={(name, reason) => setReasonModal({ open: true, cat: name, reason })}
              isFutureDate={isFutureDate}
            />
          )}
          </div>

          {/* STREAMLINED FOOTER */}
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-900 z-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmPayday}
              className="px-6 py-2.5 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting && <Spinner size="sm" />}
              <span>
                {isFutureDate
                  ? "📅 Save Plan for Payday"
                  : "Confirm & Distribute Payday 🚀"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <PaydayReasonModal
        isOpen={reasonModal.open}
        onClose={() => setReasonModal({ open: false, cat: "", reason: "" })}
        categoryName={reasonModal.cat}
        reasoning={reasonModal.reason}
      />
    </>
  );
}
