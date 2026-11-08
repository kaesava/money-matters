"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import {
  ModalDialog,
  Input,
  DatePickerField,
  AmountField,
  Button,
  FormErrorBanner,
  useToast,
} from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import type { TimelineEventItem } from "../../app/dashboard/income-and-bills/components/UpcomingTimelineTab";

export interface EditUpcomingEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimelineEventItem | null;
  onSuccess?: () => void;
}

export function EditUpcomingEventModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: EditUpcomingEventModalProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const overrideEventMut = trpc.overrideEvent.useMutation();

  useEffect(() => {
    if (event) {
      setName(event.name || "");
      setExpectedDate(event.expectedDate || "");
      setExpectedAmount(event.expectedAmount || "");
      setErrorMsg("");
    }
  }, [event, isOpen]);

  const isDirty = useMemo(() => {
    if (!event) return false;
    return (
      name.trim() !== (event.name || "").trim() ||
      expectedDate !== (event.expectedDate || "") ||
      expectedAmount !== (event.expectedAmount || "")
    );
  }, [event, name, expectedDate, expectedAmount]);

  const isValid =
    name.trim().length > 0 &&
    expectedDate.length >= 10 &&
    !isNaN(parseFloat(expectedAmount)) &&
    parseFloat(expectedAmount) > 0;

  if (!isOpen || !event) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!name.trim()) {
      setErrorMsg("Event name is required.");
      return;
    }

    const numAmount = parseFloat(expectedAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Amount must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const eventType = event.eventKind === "INCOME" ? "INCOME" : "EXPENSE";
      await overrideEventMut.mutateAsync({
        eventId: event.id,
        eventType,
        name: name.trim(),
        expectedAmount: numAmount.toFixed(2),
        expectedDate,
      });

      if (eventType === "INCOME") {
        await utils.listIncomeEvents.invalidate();
        await utils.previewPayday.invalidate();
      } else {
        await utils.listExpenseEvents.invalidate();
      }
      await utils.listPools.invalidate();

      toast.success(t("toasts.saved"));
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={t("modals.eventOverride.title")}
      subtitle={event ? t("modals.eventOverride.subtitle", { name: event.name || "Event" }) : undefined}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <FormErrorBanner message={errorMsg} />

        {Boolean(event.incomeSourceId) && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <div className="flex items-start gap-1.5 font-medium">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>{t("modals.eventOverride.singleEventNotice")}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/dashboard/income-and-bills?tab=streams&editIncomeId=${event.incomeSourceId}`);
                }}
                className="font-bold text-[#2563eb] hover:underline cursor-pointer inline-flex items-center gap-1 ml-5.5"
              >
                <span>{t("modals.eventOverride.editIncomeScheduleLink")}</span>
              </button>
            </div>
          </div>
        )}

        {Boolean(!event.incomeSourceId && (event.poolId || event.categoryId)) && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <div className="flex items-start gap-1.5 font-medium">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>{t("modals.eventOverride.singleEventNotice")}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/dashboard/income-and-bills?tab=streams&editBillId=${event.poolId || event.categoryId}`);
                }}
                className="font-bold text-[#2563eb] hover:underline cursor-pointer inline-flex items-center gap-1 ml-5.5"
              >
                <span>{t("modals.eventOverride.editBillScheduleLink")}</span>
              </button>
            </div>
          </div>
        )}

        <Input
          label={t("modals.eventOverride.nameLabel")}
          required
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errorMsg) setErrorMsg("");
          }}
          placeholder={t("modals.eventOverride.namePlaceholder")}
        />

        <DatePickerField
          label={t("modals.eventOverride.overrideDate")}
          required
          value={expectedDate}
          onChange={(val) => {
            setExpectedDate(val);
            if (errorMsg) setErrorMsg("");
          }}
        />

        <AmountField
          label={t("modals.eventOverride.overrideAmount")}
          required
          value={expectedAmount}
          onChange={(val) => {
            setExpectedAmount(val);
            if (errorMsg) setErrorMsg("");
          }}
        />

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={!isDirty || !isValid || submitting}
          >
            {t("modals.eventOverride.submit")}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
