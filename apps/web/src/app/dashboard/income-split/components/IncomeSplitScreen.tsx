"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner, useToast, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { IncomeSplitHeader } from "./IncomeSplitHeader";
import { IncomeSplitCommandPanel } from "./IncomeSplitCommandPanel";
import { IncomeSplitPoolTable } from "./IncomeSplitPoolTable";

export interface IncomeSplitScreenProps {
  readonly incomeEventId: string;
  readonly returnTo?: string;
}

interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

function extractLines(engineResult: unknown): AllocationLineItem[] {
  if (!engineResult) return [];
  let raw: Array<Record<string, unknown>> = [];
  if (Array.isArray(engineResult)) {
    raw = engineResult;
  } else if (typeof engineResult === "object" && engineResult !== null && "lines" in engineResult) {
    raw = Array.isArray((engineResult as { lines?: unknown[] }).lines)
      ? ((engineResult as { lines: Array<Record<string, unknown>> }).lines)
      : [];
  }
  return raw.map((item) => ({
    bucketId: String(item.bucketId || item.poolId || ""),
    bucketName: String(item.bucketName || item.poolName || "Unknown Pool"),
    proposedAmount: typeof item.proposedAmount === "number" ? item.proposedAmount : parseFloat(String(item.proposedAmount || "0")),
    reasoning: String(item.reasoning || ""),
  }));
}

export function IncomeSplitScreen({ incomeEventId, returnTo = "/dashboard" }: IncomeSplitScreenProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery();
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);

  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId },
    { enabled: !!incomeEventId }
  );

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const revertAllocationPlanMut = trpc.revertAllocationPlan.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  const [actualAmount, setActualAmount] = useState("0.00");
  const [initialAmount, setInitialAmount] = useState("0.00");
  const [sourceName, setSourceName] = useState("Paycheck");
  const [selectedDate, setSelectedDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date())
  );
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [initialLinesMap, setInitialLinesMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [isSavedPlan, setIsSavedPlan] = useState(false);
  const [isConfirmedPlan, setIsConfirmedPlan] = useState(false);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      setSourceName(evt.name || "Paycheck");
      const amt = evt.actualAmount || evt.expectedAmount;
      setActualAmount(amt);
      setInitialAmount(amt);
      setSelectedDate(evt.expectedDate);

      const rawLines = extractLines(previewQuery.data.engineResult);
      const initMap: Record<string, string> = {};
      rawLines.forEach((l) => {
        initMap[l.bucketId] = l.proposedAmount.toFixed(2);
      });
      setLinesMap(initMap);
      setInitialLinesMap(initMap);

      const engineResult = previewQuery.data.engineResult as unknown as { isCustomPlan?: boolean; isConfirmedPlan?: boolean };
      setIsSavedPlan(engineResult?.isCustomPlan ?? false);
      setIsConfirmedPlan(engineResult?.isConfirmedPlan ?? false);
    }
  }, [previewQuery.data]);

  const lines = useMemo(() => extractLines(previewQuery.data?.engineResult), [previewQuery.data]);
  const numericActual = parseFloat(actualAmount) || 0;

  const receivingAccountId = previewQuery.data?.incomeEvent?.receivingAccountId;

  const sweepPool = useMemo(() => {
    return pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.poolType === "EVERYDAY") || pools[0];
  }, [pools]);

  const nonSweepAllocatedSum = useMemo(() => {
    if (!sweepPool) return 0;
    return Object.entries(linesMap).reduce((acc, [bId, valStr]) => {
      if (bId === sweepPool.id) return acc;
      return acc + (parseFloat(valStr) || 0);
    }, 0);
  }, [linesMap, sweepPool]);

  const sweepPoolRemainder = useMemo(() => {
    return Math.max(-999999, numericActual - nonSweepAllocatedSum);
  }, [numericActual, nonSweepAllocatedSum]);

  const isDeficit = sweepPoolRemainder < 0;
  const isFutureDate = selectedDate > todayStr;
  const isReadOnly = isConfirmedPlan;

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const evt = previewQuery.data.incomeEvent;
    if (sourceName !== (evt.name || "Paycheck")) return true;
    if (actualAmount !== (evt.actualAmount || evt.expectedAmount)) return true;
    if (selectedDate !== evt.expectedDate) return true;
    for (const [pId, val] of Object.entries(linesMap)) {
      if (initialLinesMap[pId] !== val) return true;
    }
    return false;
  }, [previewQuery.data, sourceName, actualAmount, selectedDate, linesMap, initialLinesMap]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    let cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    if (parts[0].length > 12) {
      parts[0] = parts[0].slice(0, 12);
      cleaned = parts[1] !== undefined ? `${parts[0]}.${parts[1]}` : parts[0];
    }
    if (parts[1] && parts[1].length > 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
    setLinesMap((prev) => ({ ...prev, [bucketId]: cleaned }));
  };

  const handleResetAllEdits = () => {
    setLinesMap({ ...initialLinesMap });
    setActualAmount(initialAmount);
  };

  const attemptExit = useCallback(() => {
    if (isDirty && !isReadOnly) {
      setShowDiscardConfirm(true);
    } else {
      router.push(returnTo);
    }
  }, [isDirty, isReadOnly, router, returnTo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !showDiscardConfirm &&
        !showConfirmWarning &&
        !showDeleteConfirm &&
        !showRecalculateConfirm
      ) {
        attemptExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDiscardConfirm, showConfirmWarning, showDeleteConfirm, showRecalculateConfirm, attemptExit]);

  const handleRecalculateWaterfall = async () => {
    try {
      setSubmitting(true);
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
        name: sourceName,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });
      await utils.previewPayday.invalidate({ incomeEventId });
      toast.success(t("paydayDrawer.revertedToAutoSuccess", { defaultValue: "Recalculated waterfall with new amount." }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to recalculate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevertToAuto = async () => {
    try {
      setSubmitting(true);
      await revertAllocationPlanMut.mutateAsync({ incomeEventId });
      await utils.listAllAllocationPlans.invalidate();
      await utils.previewPayday.invalidate({ incomeEventId });
      toast.success(t("matrix.revertSuccess", { defaultValue: "Reverted to auto waterfall calculation." }));
      setIsSavedPlan(false);
      setIsConfirmedPlan(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revert.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateTrigger = () => {
    if (isSavedPlan) {
      setShowRecalculateConfirm(true);
    } else {
      if (actualAmount !== initialAmount) {
        handleRecalculateWaterfall();
      } else {
        setLinesMap({ ...initialLinesMap });
        toast.success(t("paydayDrawer.recalculateSuccess", { defaultValue: "Refreshed waterfall allocations." }));
      }
    }
  };

  const handleRecalculateSavedConfirmed = async () => {
    setShowRecalculateConfirm(false);
    await handleRevertToAuto();
  };

  const handleDeleteIncome = async () => {
    try {
      setSubmitting(true);
      await deleteIncomeMut.mutateAsync({ eventId: incomeEventId });
      toast.success("Income deleted.");
      await utils.listIncomeEvents.invalidate();
      router.push(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveSplit = async () => {
    if (isDeficit) return;
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
        name: sourceName,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });

      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      const payload = Object.entries(effectiveMap).map(([pId, val]) => ({
        poolId: pId,
        proposedAmount: (parseFloat(val) || 0).toFixed(2),
      }));

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payload,
      });

      toast.success(t("matrix.saveSplitSuccess", { defaultValue: "Income Split saved." }));
      await utils.listIncomeEvents.invalidate();
      router.push(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save split.");
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmSplit = async () => {
    setShowConfirmWarning(false);
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
        name: sourceName,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });

      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      const payload = Object.entries(effectiveMap).map(([pId, val]) => ({
        poolId: pId,
        amount: (parseFloat(val) || 0).toFixed(2),
      }));

      await confirmPaydayMut.mutateAsync({
        incomeEventId,
        actualAmount: numericActual.toFixed(2),
        markAsReceivedToday: !isFutureDate,
        lines: payload,
      });

      toast.success(t("paydayDrawer.confirmSuccess", { defaultValue: "Income Split confirmed!" }));
      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      router.push(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm split.");
    } finally {
      setSubmitting(false);
    }
  };

  const everydayAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === "EVERYDAY")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const billsAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === "REGULAR")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalsAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === "GOAL")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: "EVERYDAY" | "REGULAR" | "GOAL"; label: string; items: AllocationLineItem[] }> = [
      { type: "EVERYDAY", label: "Everyday Pools", items: [] },
      { type: "REGULAR", label: "Bills Pools", items: [] },
      { type: "GOAL", label: "Goals", items: [] },
    ];
    for (const l of lines) {
      const pType = pools.find((pool) => pool.id === l.bucketId)?.poolType || "REGULAR";
      if (pType === "EVERYDAY") groups[0].items.push(l);
      else if (pType === "GOAL") groups[2].items.push(l);
      else groups[1].items.push(l);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  if (previewQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" label={t("common.loading", { defaultValue: "Loading..." })} direction="col" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col">
      <IncomeSplitHeader
        title={sourceName}
        expectedDate={selectedDate}
        isSavedPlan={isSavedPlan}
        isConfirmedPlan={isConfirmedPlan}
        isDirty={isDirty}
        isReadOnly={isReadOnly}
        isDeficit={isDeficit}
        submitting={submitting}
        isFutureDate={isFutureDate}
        onBack={attemptExit}
        onResetEdits={handleResetAllEdits}
        onRecalculate={!isReadOnly ? handleRecalculateTrigger : undefined}
        onDeleteIncome={() => setShowDeleteConfirm(true)}
        onSaveSplit={handleSaveSplit}
        onConfirmSplit={() => setShowConfirmWarning(true)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <IncomeSplitCommandPanel
            sourceName={sourceName}
            onSourceNameChange={setSourceName}
            actualAmount={actualAmount}
            onActualAmountChange={setActualAmount}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            numericActual={numericActual}
            sweepPoolName={sweepPool?.name || "Everyday"}
            sweepPoolRemainder={sweepPoolRemainder}
            isDeficit={isDeficit}
            everydayAllocated={everydayAllocated}
            billsAllocated={billsAllocated}
            goalsAllocated={goalsAllocated}
            isReadOnly={isReadOnly}
            receivingAccountId={receivingAccountId}
            pools={pools}
            linesMap={linesMap}
            sweepPoolId={sweepPool?.id}
            bankAccounts={bankAccounts}
            isAmountModified={actualAmount !== initialAmount}
            onRecalculateWaterfall={handleRecalculateWaterfall}
            submitting={submitting}
          />

          <IncomeSplitPoolTable
            groups={groupedLines}
            pools={pools}
            sweepPoolId={sweepPool?.id}
            sweepPoolRemainder={sweepPoolRemainder}
            linesMap={linesMap}
            initialLinesMap={initialLinesMap}
            numericActual={numericActual}
            isReadOnly={isReadOnly}
            onLineAmountChange={handleLineAmountChange}
          />
        </div>
      </main>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          router.push(returnTo);
        }}
        title={t("common.discardChangesTitle", { defaultValue: "Discard changes?" })}
        description={t("paydayDrawer.discardDescription", { defaultValue: "You have unsaved Income Split edits. Are you sure you want to discard them?" })}
        confirmLabel={t("common.discard", { defaultValue: "Discard" })}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showConfirmWarning}
        onClose={() => setShowConfirmWarning(false)}
        onConfirm={executeConfirmSplit}
        title={t("paydayDrawer.confirmWarningTitle", { defaultValue: "Run Income Split?" })}
        description={t("paydayDrawer.confirmWarningDescription", { defaultValue: "Running this payday split will update your pool and bank balances immediately. Ready to proceed?" })}
        confirmLabel={t("paydayDrawer.confirmWarningConfirm", { defaultValue: "Run Income Split" })}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showRecalculateConfirm}
        onClose={() => setShowRecalculateConfirm(false)}
        onConfirm={handleRecalculateSavedConfirmed}
        title={t("paydayDrawer.recalculateConfirmTitle", { defaultValue: "Recalculate Income Split?" })}
        description={t("paydayDrawer.recalculateConfirmDescription", {
          defaultValue: "Recalculating will discard your custom saved overrides and re-run the 5-step forward-looking waterfall engine based on current balances and upcoming bills. Are you sure?",
        })}
        confirmLabel={t("paydayDrawer.recalculate", { defaultValue: "Re-calculate" })}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteIncome}
        title={t("common.deleteIncomeTitle", { defaultValue: "Delete Income" })}
        description={t("paydayDrawer.deleteDescription", { defaultValue: "Are you sure you want to delete this Income?" })}
        confirmLabel={t("common.delete", { defaultValue: "Delete" })}
        variant="danger"
      />
    </div>
  );
}
