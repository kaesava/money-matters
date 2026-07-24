"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";

interface EventOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit: {
    id: string;
    eventType: "INCOME" | "EXPENSE";
    name: string;
    expectedDate: string;
    expectedAmount: string;
    paymentMethod?: string | null;
  } | null;
  onSuccess?: () => void;
}

export default function EventOverrideModal({
  isOpen,
  onClose,
  eventToEdit,
  onSuccess,
}: EventOverrideModalProps) {
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [updateSeries, setUpdateSeries] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const overrideMut = trpc.overrideEvent.useMutation();

  useEffect(() => {
    if (eventToEdit) {
      setAmount(eventToEdit.expectedAmount);
      setExpectedDate(eventToEdit.expectedDate);
      setPaymentMethod(eventToEdit.paymentMethod || "DIRECT_DEBIT");
      setUpdateSeries(false);
    }
  }, [eventToEdit]);

  if (!isOpen || !eventToEdit) return null;

  const handleSave = async () => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      await overrideMut.mutateAsync({
        eventId: eventToEdit.id,
        eventType: eventToEdit.eventType,
        amount: (parseFloat(amount) || 0).toFixed(2),
        expectedDate,
        paymentMethod,
        updateSeries,
      });

      await utils.listIncomeEvents.invalidate();
      await utils.listExpenseEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update occurrence.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${eventToEdit.eventType === "INCOME" ? "Paycheck" : "Bill"}: ${eventToEdit.name}`}
      subtitle="Modify amount, date, or payment parameters for this occurrence"
      isDirty={false}
      onSave={handleSave}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4 text-zinc-900"
      >
        {errorMsg && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Scope Choice */}
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
            Recurrence Scope
          </span>
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-zinc-800">
            <input
              type="radio"
              name="scope"
              checked={!updateSeries}
              onChange={() => setUpdateSeries(false)}
              className="accent-[#00B4A6]"
            />
            <span>Only this occurrence (Recommended)</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-zinc-800">
            <input
              type="radio"
              name="scope"
              checked={updateSeries}
              onChange={() => setUpdateSeries(true)}
              className="accent-[#00B4A6]"
            />
            <span>This and all future occurrences (Update Master Series)</span>
          </label>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Expected Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Payment Method Tag (Optional)
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          >
            <option value="DIRECT_DEBIT">Direct Debit (Bank Auto-Pay)</option>
            <option value="BPAY">BPAY (Biller Code)</option>
            <option value="OSKO">Osko / PayID Instant Transfer</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="DIRECT_DEPOSIT">Direct Employer Payroll Deposit</option>
          </select>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Occurrence"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
