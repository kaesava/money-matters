"use client";

import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { ModalDialog } from "./ModalDialog";
import { Spinner, InfoTooltip } from "@money-matters/ui/web";
import { SeriesNoticeBanner } from "./upcoming/SeriesNoticeBanner";
import { PaydayReasonModal } from "./upcoming/PaydayReasonModal";
import { PaydayLineRow } from "./upcoming/PaydayLineRow";

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
  isQuickAdd = false,
  onSuccess,
}: PaydayPreviewModalProps) {
  const utils = trpc.useUtils();
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeEventId = incomeEventId || eventToEdit?.id || null;

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: isOpen });

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  // Tab State: "DEPOSIT" | "WATERFALL"
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

  // Pool Summary Math for Tab 2
  const everydayAllocated = lines
    .filter((l) => {
      const cat = categories.find((c) => c.id === l.bucketId);
      return cat?.type === "EVERYDAY";
    })
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const regularAllocated = lines
    .filter((l) => {
      const cat = categories.find((c) => c.id === l.bucketId);
      return cat?.type === "REGULAR";
    })
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalAllocated = lines
    .filter((l) => {
      const cat = categories.find((c) => c.id === l.bucketId);
      return cat?.type === "GOAL";
    })
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
        const createdEvt = await createUpcomingMut.mutateAsync({
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
        const preview = await utils.previewPayday.fetch({ incomeEventId: createdEvt.id });
        const payloadLines = preview.engineResult.lines.map((l: PaydayLine) => ({
          bucketId: l.bucketId,
          amount: l.proposedAmount.toFixed(2),
        }));
        await confirmPaydayMut.mutateAsync({
          incomeEventId: createdEvt.id,
          actualAmount: numericActual.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
      }
      await utils.listIncomeEvents.invalidate();
      await utils.listCategories.invalidate();
      await utils.listTransactions.invalidate();
      await utils.getMonthlySummary.invalidate();
      posthog.capture("payday_confirmed", {
        is_future_payday: isFutureDate,
        distribution_category_count: activeEventId ? lines.length : 0,
        entry_method: activeEventId ? "scheduled_payday" : "quick_record",
      });
      if (onSuccess) onSuccess();
      alert(`🚀 Payday Cascade Complete! $${numericActual.toLocaleString("en-AU", { minimumFractionDigits: 2 })} allocated across household pools.`);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process payday.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeEventId) return;
    if (!window.confirm("Warning: This upcoming income record will be permanently deleted (not archived). Are you sure?")) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteMut.mutateAsync({
        eventId: activeEventId,
        eventType: "INCOME",
      });
      await utils.listIncomeEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete income record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <span>{isQuickAdd ? "Quick Record Income" : `Process Payday: ${sourceName || "Paycheck"}`}</span>
          </div>
        }
        subtitle="Review deposit details and manage automated payday waterfall distribution"
        maxWidthClass="max-w-2xl"
      >
        <div className="flex flex-col gap-5 text-zinc-900">
          {errorMsg && (
            <div className="p-3.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between shadow-xs">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800 font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {!isQuickAdd && (eventToEdit?.isRecurring || previewData?.incomeEvent) && (
            <SeriesNoticeBanner eventType="INCOME" eventName={sourceName} />
          )}

          {/* 2-Tab View Header Toggle */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80">
            <button
              type="button"
              onClick={() => setActiveTab("WATERFALL")}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "WATERFALL"
                  ? "bg-white text-[#1B2B4B] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <span>🌊 Payday Waterfall Split</span>
              {lines.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-50 text-[#00B4A6] border border-teal-200">
                  ${numericActual.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DEPOSIT")}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "DEPOSIT"
                  ? "bg-white text-[#1B2B4B] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <span>💰 Deposit Details</span>
            </button>
          </div>

          {/* TAB 1: DEPOSIT DETAILS */}
          {activeTab === "DEPOSIT" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-bold text-zinc-700">Income Source Label</label>
                    <InfoTooltip content="Name of this paycheck or income deposit (e.g. Salary, Consulting)." />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Salary, Client Payment"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-bold text-zinc-700">Receiving Bank Account</label>
                    <InfoTooltip content="The physical bank account where this paycheck lands." />
                  </div>
                  <select
                    value={receivingAccountId}
                    onChange={(e) => setReceivingAccountId(e.target.value)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
                  >
                    <option value="">Default Account</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-bold text-zinc-700">Payday Date</label>
                    <InfoTooltip content="Date when this paycheck lands. Selecting a future date saves this allocation plan until payday." />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-bold text-zinc-700">Total Income Amount ($)</label>
                    <InfoTooltip content="Net take-home dollar amount received." />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-700">Notes / Optional Description</label>
                <textarea
                  rows={2}
                  placeholder="Add optional notes regarding this paycheck..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              {activeEventId && (
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all disabled:opacity-50"
                  >
                    🗑️ Delete Upcoming Income
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWithoutMarkingPaid}
                    disabled={submitting}
                    className="text-xs font-bold text-[#00B4A6] hover:underline"
                  >
                    Save details without executing payday →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WATERFALL ALLOCATION SPLIT */}
          {activeTab === "WATERFALL" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Summary Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-emerald-800">Everyday Pool</span>
                    <InfoTooltip content="Discretionary cash for groceries, dining, and daily spending." />
                  </div>
                  <span className="text-base font-black text-[#1B2B4B]">
                    ${everydayAllocated.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-blue-800">Bills & Fixed</span>
                    <InfoTooltip content="Automated allocations reserved for upcoming recurring bills." />
                  </div>
                  <span className="text-base font-black text-[#1B2B4B]">
                    ${regularAllocated.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-indigo-800">Savings Goals</span>
                    <InfoTooltip content="Allocations routed directly into your goal pools." />
                  </div>
                  <span className="text-base font-black text-[#1B2B4B]">
                    ${goalAllocated.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Payday Category Distribution List */}
              {lines.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B2B4B]">Category Split Breakdown</span>
                    <span className="text-[11px] font-semibold text-zinc-500">
                      Allocating <strong className="text-[#1B2B4B]">${totalAllocated.toFixed(2)}</strong> of ${numericActual.toFixed(2)}
                    </span>
                  </div>
                  {lines.map((line) => {
                    const cat = categories.find((c) => c.id === line.bucketId);
                    const curBal = cat ? parseFloat(cat.currentBalance || "0") : 0;
                    return (
                      <PaydayLineRow
                        key={line.bucketId}
                        bucketId={line.bucketId}
                        bucketName={line.bucketName}
                        categoryType={cat?.type}
                        reasoning={line.reasoning}
                        amountVal={linesMap[line.bucketId] ?? line.proposedAmount.toFixed(2)}
                        onAmountChange={(val) => setLinesMap((prev) => ({ ...prev, [line.bucketId]: val }))}
                        onShowReasoning={(name, reason) => setReasonModal({ open: true, cat: name, reason })}
                        categoryBalance={curBal}
                        healthStatus={cat?.healthStatus}
                        isFutureDate={isFutureDate}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200">
                  Enter an income amount in Deposit Details to preview your automated Payday Waterfall split.
                </div>
              )}
            </div>
          )}

          {/* STREAMLINED FOOTER */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmPayday}
              className="px-6 py-2.5 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
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
      </ModalDialog>

      <PaydayReasonModal
        isOpen={reasonModal.open}
        onClose={() => setReasonModal({ open: false, cat: "", reason: "" })}
        categoryName={reasonModal.cat}
        reasoning={reasonModal.reason}
      />
    </>
  );
}
