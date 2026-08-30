"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";
import { Spinner } from "@money-matters/ui/web";

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
  const [updateSeries, setUpdateSeries] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const overrideMut = trpc.overrideEvent.useMutation();

  useEffect(() => {
    if (eventToEdit) {
      setAmount(eventToEdit.expectedAmount);
      setExpectedDate(eventToEdit.expectedDate);
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
      title={`${t('modals.eventOverride.title')}: ${eventToEdit.name}`}
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

        {/* Notice & Link to Master Series */}
        <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-extrabold text-[#1B2B4B]">{t('modals.eventOverride.title')}</span>
            <span className="text-[11px] text-zinc-600">Editing this specific {eventToEdit.eventType.toLowerCase()} date or amount.</span>
          </div>
          <a
            href="/dashboard/income-and-bills"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/dashboard/income-and-bills?search=${encodeURIComponent(eventToEdit.name)}`;
            }}
            className="text-xs font-black text-[#00B4A6] hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            <span>{t("modals.eventOverride.editMasterSeries", { defaultValue: "Edit Master Series" })}</span>
            <span>→</span>
          </a>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t('modals.eventOverride.overrideAmount')}
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
              {t('modals.eventOverride.overrideDate')}
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Spinner size="sm" />}
            {t('modals.eventOverride.submit')}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
