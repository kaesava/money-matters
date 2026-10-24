"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner, useToast, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { IncomeEventInlineCard } from "./IncomeEventInlineCard";
import { PaydayTransferModal } from "./PaydayTransferModal";
import { IncomeSplitPoolTable } from "./IncomeSplitPoolTable";
import { PaydayCelebrationCard } from "./PaydayCelebrationCard";
import { EnvelopeDetailDrawer } from "../../income-and-bills/components/EnvelopeDetailDrawer";
import { EnvelopeFormModal } from "../../../../components/web/EnvelopeFormModal";
import { useLocale } from "../../../../providers/LocaleProvider";
import { ChevronDown } from "lucide-react";
import { UnsavedSplitExitDialog } from "./UnsavedSplitExitDialog";

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

interface PaydayPreviewData {
  incomeEventName?: string;
  actualAmount?: number | null;
  expectedAmount?: number;
  expectedDate?: string;
  hasSavedPlan: boolean;
  planStatus: string;
  lines: Array<{
    envelopeId: string;
    envelopeName: string;
    proposedAmount: number;
    savedAmount?: number | null;
    reasoning?: string | null;
  }>;
}

export function IncomeSplitScreen({ incomeEventId, returnTo = "/dashboard" }: IncomeSplitScreenProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();
  const { fmt, userTimezone, timezone } = useLocale();
  const activeTz = userTimezone || timezone || "Australia/Sydney";

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
  const resetAllocationPlanMut = trpc.resetAllocationPlan.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  const [actualAmount, setActualAmount] = useState("0.00");
  const [sourceName, setSourceName] = useState("Paycheck");
  const [selectedDate, setSelectedDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: activeTz }).format(new Date())
  );
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [initialLinesMap, setInitialLinesMap] = useState<Record<string, string>>({});
  const [reasoningMap, setReasoningMap] = useState<Record<string, string>>({});
  const [initialReasoningMap, setInitialReasoningMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showConfirmWarning, setShowConfirmWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [isSavedPlan, setIsSavedPlan] = useState(false);
  const [isConfirmedPlan, setIsConfirmedPlan] = useState(false);
  const [activeDrawerPool, setActiveDrawerPool] = useState<{ id: string; name: string } | null>(null);
  const [poolToEdit, setPoolToEdit] = useState<React.ComponentProps<typeof EnvelopeFormModal>["envelopeToEdit"] | null>(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [showTableDetails, setShowTableDetails] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const applyPreviewData = useCallback((pData: PaydayPreviewData) => {
    setSourceName(pData.incomeEventName || "Paycheck");
    const amt = String(pData.actualAmount ?? pData.expectedAmount);
    setActualAmount(amt);
    setSelectedDate(pData.expectedDate || "");

    const initMap: Record<string, string> = {};
    const initReasoningMap: Record<string, string> = {};
    pData.lines.forEach((l) => {
      const val = l.savedAmount ?? l.proposedAmount;
      initMap[l.envelopeId] = val.toFixed(2);
      if (l.reasoning && val > 0) {
        initReasoningMap[l.envelopeId] = l.reasoning;
      }
    });
    setLinesMap(initMap);
    setInitialLinesMap(initMap);
    setReasoningMap(initReasoningMap);
    setInitialReasoningMap(initReasoningMap);

    setIsSavedPlan(pData.hasSavedPlan);
    setIsConfirmedPlan(pData.planStatus === "CONFIRMED");
  }, []);

  useEffect(() => {
    if (previewQuery.data) {
      applyPreviewData(previewQuery.data);
    }
  }, [previewQuery.data, applyPreviewData]);

  const lines = useMemo(() => {
    if (!previewQuery.data) return [];
    return previewQuery.data.lines.map((l) => ({
      bucketId: l.envelopeId,
      bucketName: l.envelopeName,
      proposedAmount: l.savedAmount ?? l.proposedAmount,
      reasoning: l.reasoning ?? "",
    }));
  }, [previewQuery.data]);
  const numericActual = parseFloat(actualAmount) || 0;

  const receivingAccountId = previewQuery.data?.receivingAccountId;

  const sweepPool = useMemo(() => {
    return pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.envelopeType === "EVERYDAY") || pools[0];
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
  const isReadOnly = isConfirmedPlan;

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: activeTz }).format(new Date());
  }, [activeTz]);
  const isFutureDate = selectedDate > todayStr;

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const pData = previewQuery.data;
    if (sourceName !== (pData.incomeEventName || "Paycheck")) return true;
    if (actualAmount !== String(pData.actualAmount ?? pData.expectedAmount)) return true;
    if (selectedDate !== pData.expectedDate) return true;
    for (const [pId, val] of Object.entries(linesMap)) {
      if (initialLinesMap[pId] !== val) return true;
    }
    for (const [pId, val] of Object.entries(reasoningMap)) {
      if (initialReasoningMap[pId] !== val) return true;
    }
    return false;
  }, [previewQuery.data, sourceName, actualAmount, selectedDate, linesMap, initialLinesMap, reasoningMap, initialReasoningMap]);

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
    if ((parseFloat(cleaned) || 0) <= 0) {
      setReasoningMap((prev) => ({ ...prev, [bucketId]: "" }));
    }
  };

  const handleLineReasoningChange = (bucketId: string, reasoning: string) => {
    const currentVal = bucketId === sweepPool?.id ? sweepPoolRemainder : parseFloat(linesMap[bucketId] ?? "0") || 0;
    if (currentVal <= 0) return;
    setReasoningMap((prev) => ({ ...prev, [bucketId]: reasoning }));
  };

  const executeAutoSave = useCallback(async () => {
    if (!previewQuery.data || isReadOnly) return;
    const pData = previewQuery.data;
    const isEventDirty =
      sourceName !== (pData.incomeEventName || "Paycheck") ||
      actualAmount !== String(pData.actualAmount ?? pData.expectedAmount) ||
      selectedDate !== pData.expectedDate;

    let isAllocationsDirty = false;
    for (const [pId, val] of Object.entries(linesMap)) {
      if (initialLinesMap[pId] !== val) {
        isAllocationsDirty = true;
        break;
      }
    }
    if (!isAllocationsDirty) {
      for (const [pId, val] of Object.entries(reasoningMap)) {
        if (initialReasoningMap[pId] !== val) {
          isAllocationsDirty = true;
          break;
        }
      }
    }

    if (!isEventDirty && !isAllocationsDirty) return;

    try {
      if (isEventDirty) {
        await overrideEventMut.mutateAsync({
          eventId: incomeEventId,
          eventType: "INCOME",
          name: sourceName,
          actualAmount: parseFloat(actualAmount).toFixed(2),
          actualDate: selectedDate,
          expectedAmount: parseFloat(actualAmount).toFixed(2),
          expectedDate: selectedDate,
        });
      }

      if (isAllocationsDirty && !isDeficit) {
        const effectiveMap = { ...linesMap };
        if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
        const payload = Object.entries(effectiveMap).map(([pId, val]) => {
          const amt = parseFloat(val) || 0;
          return {
            poolId: pId,
            proposedAmount: amt.toFixed(2),
            reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
          };
        });

        await saveBulkAllocationsMut.mutateAsync({
          incomeEventId,
          totalIncomeAmount: numericActual.toFixed(2),
          lines: payload,
        });

        if (!isSavedPlan) {
          toast.success(t("matrix.lockSplitSuccess"));
        }
      }
    } catch {
      // Auto-save best effort on navigation
    }
  }, [
    previewQuery.data,
    isReadOnly,
    sourceName,
    actualAmount,
    selectedDate,
    linesMap,
    initialLinesMap,
    reasoningMap,
    initialReasoningMap,
    overrideEventMut,
    incomeEventId,
    isDeficit,
    sweepPool,
    sweepPoolRemainder,
    lines,
    saveBulkAllocationsMut,
    numericActual,
    isSavedPlan,
    toast,
  ]);

  const [showExitDialog, setShowExitDialog] = useState(false);

  const attemptExit = useCallback(() => {
    if (isDirty && !isReadOnly) {
      setShowExitDialog(true);
      return;
    }
    router.push(returnTo);
  }, [isDirty, isReadOnly, router, returnTo]);

  const handleSaveAndExit = async () => {
    if (isDeficit) return;
    try {
      setSubmitting(true);
      await executeAutoSave();
      router.push(returnTo);
    } finally {
      setSubmitting(false);
      setShowExitDialog(false);
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitDialog(false);
    router.push(returnTo);
  };

  const handleDiscardEdits = () => {
    setLinesMap({ ...initialLinesMap });
    setReasoningMap({ ...initialReasoningMap });
    toast.success(t("paydayDrawer.discardEditsSuccess"));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !showConfirmWarning &&
        !showDeleteConfirm &&
        !showRecalculateConfirm &&
        !showExitDialog
      ) {
        attemptExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirmWarning, showDeleteConfirm, showRecalculateConfirm, showExitDialog, attemptExit]);

  const handleRecalculateWaterfall = async () => {
    try {
      setSubmitting(true);
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });
      if (isSavedPlan) {
        await resetAllocationPlanMut.mutateAsync({ incomeEventId });
        setIsSavedPlan(false);
      }
      const freshData = await utils.previewPayday.fetch({ incomeEventId }, { staleTime: 0 });
      if (freshData) {
        applyPreviewData(freshData);
      }
      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
      ]);
      toast.success(t("paydayDrawer.recalculateSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.recalculateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateTrigger = () => {
    setShowRecalculateConfirm(true);
  };

  const handleRecalculateSavedConfirmed = async () => {
    setShowRecalculateConfirm(false);
    await handleRecalculateWaterfall();
  };

  const handleDeleteIncome = async () => {
    try {
      setSubmitting(true);
      await deleteIncomeMut.mutateAsync({ eventId: incomeEventId });
      toast.success(t("paydayDrawer.incomeDeleted"));
      await utils.listIncomeEvents.invalidate();
      router.push(returnTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.deleteFailed"));
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
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });

      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      const payload = Object.entries(effectiveMap).map(([pId, val]) => {
        const amt = parseFloat(val) || 0;
        return {
          poolId: pId,
          proposedAmount: amt.toFixed(2),
          reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
        };
      });

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payload,
      });

      setIsSavedPlan(true);
      setInitialLinesMap({ ...effectiveMap });
      setInitialReasoningMap({ ...reasoningMap });
      toast.success(t("matrix.lockSplitSuccess"));
      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.previewPayday.invalidate({ incomeEventId }),
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.saveSplitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmSplit = async () => {
    if (isDeficit || submitting || isFutureDate) return;
    setShowConfirmWarning(false);
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: incomeEventId,
        eventType: "INCOME",
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });

      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      const payload = Object.entries(effectiveMap).map(([pId, val]) => {
        const amt = parseFloat(val) || 0;
        return {
          envelopeId: pId,
          amount: amt.toFixed(2),
          reasoning: amt <= 0 ? undefined : (reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined)),
        };
      });

      await confirmPaydayMut.mutateAsync({
        incomeEventId,
        actualAmount: numericActual.toFixed(2),
        markAsReceivedToday: false,
        lines: payload,
      });

      toast.success(t("paydayDrawer.confirmSuccess"));
      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      setShowTransferModal(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("paydayDrawer.confirmSplitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const everydayAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.envelopeType === "EVERYDAY")
    .reduce((sum, l) => {
      const val = l.bucketId === sweepPool?.id ? Math.max(0, sweepPoolRemainder) : (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0);
      return sum + val;
    }, 0);

  const billsAllocated = lines
    .filter((l) => {
      const et = pools.find((p) => p.id === l.bucketId)?.envelopeType;
      return et === "SCHEDULED_BILL" || et === "FLEXIBLE_BILL";
    })
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalsAllocated = lines
    .filter((l) => {
      const et = pools.find((p) => p.id === l.bucketId)?.envelopeType;
      return et === "TARGET_GOAL" || et === "ONGOING_GOAL";
    })
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: "EVERYDAY" | "REGULAR" | "GOAL"; label: string; items: AllocationLineItem[] }> = [
      { type: "EVERYDAY", label: t("paydayDrawer.everydayPools"), items: [] },
      { type: "REGULAR", label: t("paydayDrawer.billsPools"), items: [] },
      { type: "GOAL", label: t("paydayDrawer.goalsPools"), items: [] },
    ];
    for (const l of lines) {
      const p = pools.find((pool) => pool.id === l.bucketId);
      const et = p?.envelopeType;
      if (et === "EVERYDAY") groups[0].items.push(l);
      else if (et === "TARGET_GOAL" || et === "ONGOING_GOAL") groups[2].items.push(l);
      else groups[1].items.push(l);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  if (previewQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" label={t("common.loading")} direction="col" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <IncomeEventInlineCard
        sourceName={sourceName}
        onSourceNameChange={setSourceName}
        actualAmount={actualAmount}
        onActualAmountChange={setActualAmount}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        isReadOnly={isReadOnly}
        onDeleteIncome={() => setShowDeleteConfirm(true)}
        onBack={attemptExit}
      />

      {/* Level 1: Payday Celebration & 1-Tap Lock In Card */}
      <PaydayCelebrationCard
        everydayAllocated={everydayAllocated}
        billsAllocated={billsAllocated}
        goalsAllocated={goalsAllocated}
        safeToSpend={sweepPoolRemainder}
        isConfirmed={isConfirmedPlan}
        isLocked={isSavedPlan}
        isDirty={isDirty}
        isFutureDate={isFutureDate}
        submitting={submitting}
        isDeficit={isDeficit}
        onConfirm={() => {
          if (!isFutureDate && !isDeficit && !submitting) {
            setShowConfirmWarning(true);
          }
        }}
        onUnlockAndRecalculate={!isReadOnly ? handleRecalculateTrigger : undefined}
        onRecalculate={!isReadOnly ? handleRecalculateTrigger : undefined}
        onLockSplit={!isReadOnly ? handleSaveSplit : undefined}
        onSaveChanges={!isReadOnly ? handleSaveSplit : undefined}
        onDiscardEdits={!isReadOnly ? handleDiscardEdits : undefined}
        formatAUD={(amount) => fmt(amount)}
      />

      <div className="flex-1 w-full space-y-4">
        {/* Progressive Disclosure Toggle Button for Detailed Table */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowTableDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span>{showTableDetails ? t("paydayDrawer.hideDetailedAllocations") : t("paydayDrawer.showDetailedAllocations")}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showTableDetails ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showTableDetails && (
          <IncomeSplitPoolTable
            groups={groupedLines}
            pools={pools}
            sweepPoolId={sweepPool?.id}
            sweepPoolRemainder={sweepPoolRemainder}
            linesMap={linesMap}
            initialLinesMap={initialLinesMap}
            reasoningMap={reasoningMap}
            numericActual={numericActual}
            isReadOnly={isReadOnly}
            onLineAmountChange={handleLineAmountChange}
            onLineReasoningChange={handleLineReasoningChange}
            onOpenPoolDrawer={(poolId, poolName) => setActiveDrawerPool({ id: poolId, name: poolName })}
          />
        )}
      </div>

      <PaydayTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          router.push(returnTo);
        }}
        receivingAccountId={receivingAccountId}
        pools={pools}
        linesMap={linesMap}
        sweepPoolId={sweepPool?.id}
        sweepPoolRemainder={sweepPoolRemainder}
        bankAccounts={bankAccounts}
      />

      {/* Side-Over Envelope Drawer */}
      <EnvelopeDetailDrawer
        isOpen={Boolean(activeDrawerPool)}
        categoryName={activeDrawerPool?.name || ""}
        categoryId={activeDrawerPool?.id}
        onClose={() => setActiveDrawerPool(null)}
        onEditPool={(pool) => {
          setPoolToEdit(pool);
          setIsPoolModalOpen(true);
        }}
      />

      {/* Edit Envelope Modal */}
      <EnvelopeFormModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        envelopeToEdit={poolToEdit}
        onSuccess={() => {
          poolsQuery.refetch();
          previewQuery.refetch();
        }}
      />


      <ConfirmDialog
        isOpen={showConfirmWarning}
        onClose={() => setShowConfirmWarning(false)}
        onConfirm={executeConfirmSplit}
        title={t("paydayDrawer.confirmWarningTitle")}
        description={t("paydayDrawer.confirmWarningDescription")}
        confirmLabel={t("paydayDrawer.confirmWarningConfirm")}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showRecalculateConfirm}
        onClose={() => setShowRecalculateConfirm(false)}
        onConfirm={handleRecalculateSavedConfirmed}
        title={isSavedPlan ? t("paydayDrawer.recalculateConfirmTitle") : t("paydayDrawer.recalculateUnlockedConfirmTitle")}
        description={isSavedPlan ? t("paydayDrawer.recalculateConfirmDescription") : t("paydayDrawer.recalculateUnlockedConfirmDescription")}
        confirmLabel={isSavedPlan ? t("paydayDrawer.unlockAndRecalculate") : t("paydayDrawer.recalculate")}
        variant="danger"
      />

      <UnsavedSplitExitDialog
        isOpen={showExitDialog}
        isDeficit={isDeficit}
        deficitAmount={fmt(Math.abs(sweepPoolRemainder))}
        submitting={submitting}
        onClose={() => setShowExitDialog(false)}
        onDiscardAndExit={handleDiscardAndExit}
        onSaveAndExit={handleSaveAndExit}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteIncome}
        title={t("common.deleteIncomeTitle")}
        description={t("paydayDrawer.deleteDescription")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
}
