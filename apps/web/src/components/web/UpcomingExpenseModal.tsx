"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, Button, AmountField, fmtDateIso, ModalDialog, Input, DatePickerField, GenericSelectField, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { MarkPaidModal, ShortfallTransferItem } from "../../app/dashboard/income-and-bills/components/MarkPaidModal";
import { useLocale } from "../../providers/LocaleProvider";


interface UpcomingExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: {
    id?: string;
    name?: string;
    poolId?: string;
    categoryId?: string;
    expectedAmount?: string;
    expectedDate?: string;
    note?: string;
  } | null;
  onSuccess?: () => void;
}

export default function UpcomingExpenseModal({
  isOpen,
  onClose,
  eventToEdit,
  onSuccess,
}: UpcomingExpenseModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { userTimezone } = useLocale();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);

  const todayStr = fmtDateIso(undefined, userTimezone);

  const [name, setName] = useState("");
  const [poolId, setPoolId] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState(todayStr);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);

  const overrideMut = trpc.overrideEvent.useMutation();
  const markPaidMut = trpc.overrideEvent.useMutation();
  const createExpenseSourceMut = trpc.createExpenseSource.useMutation();
  const recordExpenseMut = trpc.recordExpense.useMutation();
  const moveMoneyMut = trpc.moveMoney.useMutation();

  useEffect(() => {
    const currentTodayStr = fmtDateIso(undefined, userTimezone);
    if (eventToEdit) {
      setName(eventToEdit.name || "");
      setPoolId(eventToEdit.poolId || eventToEdit.categoryId || pools[0]?.id || "");
      setAmount(eventToEdit.expectedAmount || "");
      setExpectedDate(eventToEdit.expectedDate || currentTodayStr);
      setNote(eventToEdit.note || "");
    } else {
      setName("");
      setPoolId(pools[0]?.id || "");
      setAmount("");
      setExpectedDate(currentTodayStr);
      setNote("");
    }
    setErrorMsg("");
  }, [eventToEdit, isOpen, pools]);

  const isDirty = useMemo(() => {
    if (!eventToEdit) {
      return name.trim() !== "" || amount.trim() !== "" || note.trim() !== "";
    }
    return (
      name !== (eventToEdit.name || "") ||
      amount !== (eventToEdit.expectedAmount || "") ||
      poolId !== (eventToEdit.poolId || eventToEdit.categoryId || pools[0]?.id || "") ||
      note !== (eventToEdit.note || "")
    );
  }, [eventToEdit, name, amount, poolId, note, pools]);

  const isValid = name.trim() !== "" && amount.trim() !== "" && parseFloat(amount) > 0;

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const selectedPool = pools.find((p) => p.id === poolId);

  const handleSaveUpcoming = async () => {
    if (!name.trim()) {
      setErrorMsg("Expense name is required.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await overrideMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: "EXPENSE",
          name,
          amount: numAmount.toFixed(2),
          expectedDate,
          note,
        });
      } else {
        await createExpenseSourceMut.mutateAsync({
          name,
          amount: numAmount.toFixed(2),
          poolId: poolId || pools[0]?.id || "",
          startDate: expectedDate,
          isRecurring: false,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      toast.success(t("toasts.saved"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save upcoming expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const executeMarkPaid = async (customAmount?: number, customDate?: string) => {
    setSubmitting(true);
    const finalAmt = customAmount !== undefined ? customAmount : numAmount;
    const finalDt = customDate || expectedDate;
    try {
      if (eventToEdit?.id) {
        await markPaidMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: "EXPENSE",
          status: "CONFIRMED",
          actualAmount: finalAmt.toFixed(2),
          note: note || `Paid ${name}`,
        });
      } else {
        await recordExpenseMut.mutateAsync({
          poolId: poolId || pools[0]?.id || "",
          amount: finalAmt.toFixed(2),
          flowType: "DEBIT",
          note: note || `Paid ${name}`,
          recordedAt: finalDt,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listTransactions.invalidate();
      toast.success(t("toasts.saved"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to mark expense paid.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaidClick = () => {
    setErrorMsg("");
    if (!name.trim()) {
      setErrorMsg("Please enter a merchant or bill name.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }
    setShowMarkPaidModal(true);
  };

  const handleConfirmMarkPaidModal = async ({
    amount: finalAmount,
    date: finalDate,
    transfers,
  }: {
    amount: number;
    date: string;
    transfers?: ShortfallTransferItem[];
  }) => {
    const destPoolId = poolId || pools[0]?.id || "";
    try {
      if (transfers && transfers.length > 0) {
        await Promise.all(
          transfers.map((t) =>
            moveMoneyMut.mutateAsync({
              sourcePoolId: t.poolId,
              destinationPoolId: destPoolId,
              amount: t.amount,
              note: "Shortfall Top Up",
            })
          )
        );
      }
      await executeMarkPaid(finalAmount, finalDate);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to execute mark paid.");
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={eventToEdit?.id ? `Manage Bill — ${eventToEdit.name}` : "Schedule Upcoming Bill"}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs font-medium text-zinc-700">
        <FormErrorBanner message={errorMsg} />

        <Input
          label="Bill / Merchant Name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Energy Australia, Netflix, Gym"
        />

        <AmountField
          label="Amount ($)"
          required
          value={amount}
          onChange={setAmount}
        />

        <GenericSelectField
          label={t("modals.incomeExpenseForm.assignPool", { defaultValue: "Assign to Pool" })}
          required
          value={poolId}
          onChange={setPoolId}
          options={pools.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.poolType})`,
          }))}
        />

        <DatePickerField
          label={t("modals.upcomingExpense.dueDate", { defaultValue: "Due Date" })}
          value={expectedDate}
          onChange={setExpectedDate}
        />

        <Input
          label="Note (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reference or memo"
        />

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveUpcoming}
            loading={submitting}
            disabled={!isDirty || !isValid || submitting}
          >
            {t("modals.upcomingExpense.saveUpcoming", { defaultValue: "Save Upcoming" })}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleMarkPaidClick}
            loading={submitting}
            disabled={!isValid || submitting}
          >
            {t("actions.markPaid", { defaultValue: "Mark Paid" })}
          </Button>
        </div>
      </div>

      <MarkPaidModal
        isOpen={showMarkPaidModal}
        onClose={() => setShowMarkPaidModal(false)}
        billName={name}
        poolId={poolId || pools[0]?.id}
        poolName={selectedPool?.name}
        poolType={(selectedPool as { poolType?: string })?.poolType}
        initialAmount={numAmount}
        initialDate={expectedDate}
        availableCategories={pools.map((p) => ({
          ...p,
          currentBalance: parseFloat(String(p.currentBalance || "0")),
        }))}
        onConfirmMarkPaid={handleConfirmMarkPaidModal}
      />
    </ModalDialog>
  );
}

