"use client";

import React, { useState } from "react";
import { ModalDialog, Input, AmountField, DatePickerField, GenericSelectField, Button, FormErrorBanner, useToast } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { useLocale } from "../../../../providers/LocaleProvider";

interface OneOffExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pools: Array<{ id: string; name: string; poolType: string }>;
  categories: Array<{ id: string; name: string; poolId: string }>;
}

export function OneOffExpenseModal({ isOpen, onClose, pools, categories }: OneOffExpenseModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { currency, currencySymbol, minorUnits } = useLocale();

  const billPools = pools.filter((p) => p.poolType === "REGULAR");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState(billPools[0]?.id || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [expectedDate, setExpectedDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date())
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const createOneOffMut = trpc.createOneOffExpense.useMutation();

  const matchingCategories = categories.filter((c) => c.poolId === selectedPoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg("Name is required.");
    if (!amount || parseFloat(amount) <= 0) return setErrorMsg("Valid amount is required.");
    if (!selectedPoolId) return setErrorMsg("Target Bills pool is required.");
    if (!expectedDate) return setErrorMsg("Date is required.");

    setSubmitting(true);
    setErrorMsg("");
    try {
      await createOneOffMut.mutateAsync({
        name: name.trim(),
        amount: parseFloat(amount).toFixed(2),
        poolId: selectedPoolId,
        categoryId: selectedCategoryId || undefined,
        expectedDate,
      });
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      toast.success("One-off expense scheduled.");
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  const isDirty = Boolean(name.trim() || amount.trim());
  const isValid = Boolean(name.trim() && amount && parseFloat(amount) > 0 && selectedPoolId);

  if (!isOpen) return null;

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={isDirty} title="Add One-Off Expense" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
        <FormErrorBanner message={errorMsg} />

        <Input label="Expense Name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car Rego, Dentist Checkup" />

        <AmountField label="Amount" required value={amount} onChange={setAmount} currency={currency} currencySymbol={currencySymbol} minorUnits={minorUnits} />

        <GenericSelectField
          label="Bills Envelope"
          required
          value={selectedPoolId}
          onChange={(val) => {
            setSelectedPoolId(val);
            setSelectedCategoryId("");
          }}
          options={billPools.map((p) => ({ value: p.id, label: p.name }))}
        />

        {matchingCategories.length > 0 && (
          <GenericSelectField
            label="Category (Optional)"
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            placeholder="Select a category"
            options={[{ value: "", label: "None" }, ...matchingCategories.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}

        <DatePickerField label="Due Date" required value={expectedDate} onChange={setExpectedDate} />

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" loading={submitting} disabled={!isDirty || !isValid || submitting}>
            Schedule Expense
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
