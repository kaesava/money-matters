"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useLocale } from "../../../../providers/LocaleProvider";
import type { EnvelopeFormModal } from "../../../../components/web/EnvelopeFormModal";
import { useIncomeSplitActions } from "./useIncomeSplitActions";

export interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

export interface PaydayPreviewData {
  incomeEventName?: string;
  actualAmount?: number | null;
  expectedAmount?: number;
  expectedDate?: string;
  hasSavedPlan: boolean;
  planStatus: string;
  receivingAccountId?: string | null;
  lines: Array<{
    envelopeId: string;
    envelopeName: string;
    proposedAmount: number;
    savedAmount?: number | null;
    reasoning?: string | null;
  }>;
}

export function useIncomeSplitState({
  incomeEventId,
  returnTo = "/dashboard",
}: {
  incomeEventId: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const { userTimezone, timezone } = useLocale();
  const activeTz = userTimezone || timezone || "Australia/Sydney";

  const poolsQuery = trpc.listPools.useQuery();
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);

  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId },
    { enabled: !!incomeEventId }
  );

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
  const [celebrationTargets, setCelebrationTargets] = useState<import("@money-matters/types").TargetCelebrationItem[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);

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

  const lines: AllocationLineItem[] = useMemo(() => {
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
    const rawRemainder = numericActual - nonSweepAllocatedSum;
    const roundedRemainder = Math.round(rawRemainder * 100) / 100;
    if (Object.is(roundedRemainder, -0) || Math.abs(roundedRemainder) < 0.005) {
      return 0;
    }
    return Math.max(-999999, roundedRemainder);
  }, [numericActual, nonSweepAllocatedSum]);

  const isDeficit = sweepPoolRemainder < -0.01;
  const isReadOnly = isConfirmedPlan;

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: activeTz }).format(new Date());
  }, [activeTz]);
  const isFutureDate = selectedDate > todayStr;

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const pData = previewQuery.data;
    if (sourceName !== (pData.incomeEventName || "Paycheck")) return true;

    const expectedNum = Number(pData.actualAmount ?? pData.expectedAmount ?? 0);
    const actualNum = parseFloat(actualAmount) || 0;
    if (Math.abs(actualNum - expectedNum) > 0.009) return true;

    if (selectedDate !== (pData.expectedDate || "")) return true;

    for (const [pId, val] of Object.entries(linesMap)) {
      const initVal = parseFloat(initialLinesMap[pId] || "0");
      const currentVal = parseFloat(val || "0");
      if (Math.abs(currentVal - initVal) > 0.009) return true;
    }
    for (const [pId, val] of Object.entries(reasoningMap)) {
      if ((initialReasoningMap[pId] || "") !== (val || "")) return true;
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

  const {
    handleDiscardAndExit,
    handleDiscardEdits,
    handleRecalculateSavedConfirmed,
    handleDeleteIncome,
    handleSaveSplit,
    executeConfirmSplit,
  } = useIncomeSplitActions({
    incomeEventId,
    sourceName,
    actualAmount,
    selectedDate,
    numericActual,
    lines,
    linesMap,
    setLinesMap,
    initialLinesMap,
    setInitialLinesMap,
    reasoningMap,
    setReasoningMap,
    initialReasoningMap,
    setInitialReasoningMap,
    sweepPool,
    sweepPoolRemainder,
    isDeficit,
    isReadOnly,
    isFutureDate,
    isSavedPlan,
    setIsSavedPlan,
    submitting,
    setSubmitting,
    setShowConfirmWarning,
    setShowDeleteConfirm,
    setShowRecalculateConfirm,
    setShowExitDialog,
    setShowTransferModal,
    setCelebrationTargets,
    returnTo,
    previewData: previewQuery.data,
    applyPreviewData,
    setSourceName,
    setActualAmount,
    setSelectedDate,
  });

  const attemptExit = useCallback(() => {
    if (isDirty && !isReadOnly) {
      setShowExitDialog(true);
      return;
    }
    router.push(returnTo);
  }, [isDirty, isReadOnly, router, returnTo]);

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

  const handleRecalculateTrigger = () => {
    setShowRecalculateConfirm(true);
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
      return et === "BILL" || et === "SCHEDULED_BILL" || et === "FLEXIBLE_BILL";
    })
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalsAllocated = lines
    .filter((l) => {
      const et = pools.find((p) => p.id === l.bucketId)?.envelopeType;
      return et === "GOAL" || et === "TARGET_GOAL" || et === "ONGOING_GOAL";
    })
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: "EVERYDAY" | "BILL" | "GOAL" | "REGULAR"; label: string; items: AllocationLineItem[] }> = [
      { type: "EVERYDAY", label: t("paydayDrawer.everydayPools"), items: [] },
      { type: "BILL", label: t("paydayDrawer.billsPools"), items: [] },
      { type: "GOAL", label: t("paydayDrawer.goalsPools"), items: [] },
    ];
    for (const l of lines) {
      const p = pools.find((pool) => pool.id === l.bucketId);
      const et = p?.envelopeType;
      if (et === "EVERYDAY") groups[0].items.push(l);
      else if (et === "GOAL" || et === "TARGET_GOAL" || et === "ONGOING_GOAL") groups[2].items.push(l);
      else groups[1].items.push(l);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  return {
    poolsQuery,
    previewQuery,
    bankAccountsQuery,
    pools,
    bankAccounts,
    receivingAccountId,
    actualAmount,
    setActualAmount,
    sourceName,
    setSourceName,
    selectedDate,
    setSelectedDate,
    linesMap,
    initialLinesMap,
    reasoningMap,
    numericActual,
    sweepPool,
    sweepPoolRemainder,
    isDeficit,
    isReadOnly,
    isSavedPlan,
    isConfirmedPlan,
    isFutureDate,
    isDirty,
    submitting,
    everydayAllocated,
    billsAllocated,
    goalsAllocated,
    groupedLines,
    showConfirmWarning,
    setShowConfirmWarning,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showRecalculateConfirm,
    setShowRecalculateConfirm,
    showExitDialog,
    setShowExitDialog,
    activeDrawerPool,
    setActiveDrawerPool,
    poolToEdit,
    setPoolToEdit,
    isPoolModalOpen,
    setIsPoolModalOpen,
    showTableDetails,
    setShowTableDetails,
    showTransferModal,
    setShowTransferModal,
    celebrationTargets,
    handleLineAmountChange,
    handleLineReasoningChange,
    attemptExit,
    handleDiscardAndExit,
    handleDiscardEdits,
    handleRecalculateTrigger,
    handleRecalculateSavedConfirmed,
    handleDeleteIncome,
    handleSaveSplit,
    executeConfirmSplit,
  };
}
