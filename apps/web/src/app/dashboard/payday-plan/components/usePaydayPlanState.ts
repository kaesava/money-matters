"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { computePaydayAllocationSummary, sanitizeDecimalInput } from "@money-matters/types";
import { trpc } from "../../../../lib/trpc";
import { useLocale } from "../../../../providers/LocaleProvider";
import type { EnvelopeFormModal } from "../../../../components/web/EnvelopeFormModal";
import { usePaydayPlanActions } from "./usePaydayPlanActions";

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
  lines: Array<{ envelopeId: string; envelopeName: string; proposedAmount: number; savedAmount?: number | null; reasoning?: string | null }>;
}

export function usePaydayPlanState({ incomeEventId, returnTo = "/dashboard" }: { incomeEventId: string; returnTo?: string }) {
  const router = useRouter();
  const { userTimezone, timezone } = useLocale();
  const activeTz = userTimezone || timezone || "Australia/Sydney";

  const poolsQuery = trpc.listEnvelopes.useQuery();
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);
  const previewQuery = trpc.previewPayday.useQuery({ incomeEventId }, { enabled: !!incomeEventId });

  const [actualAmount, setActualAmount] = useState("0.00");
  const [sourceName, setSourceName] = useState("Paycheck");
  const [selectedDate, setSelectedDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: activeTz }).format(new Date()));
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
    setActualAmount(String(pData.actualAmount ?? pData.expectedAmount));
    setSelectedDate(pData.expectedDate || "");

    const initMap: Record<string, string> = {};
    const initReasoning: Record<string, string> = {};
    pData.lines.forEach((l) => {
      const val = l.savedAmount ?? l.proposedAmount;
      initMap[l.envelopeId] = val.toFixed(2);
      if (l.reasoning && val > 0) initReasoning[l.envelopeId] = l.reasoning;
    });
    setLinesMap(initMap);
    setInitialLinesMap(initMap);
    setReasoningMap(initReasoning);
    setInitialReasoningMap(initReasoning);
    setIsSavedPlan(pData.hasSavedPlan);
    setIsConfirmedPlan(pData.planStatus === "CONFIRMED");
  }, []);

  useEffect(() => {
    if (previewQuery.data) applyPreviewData(previewQuery.data);
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
  const sweepPool = useMemo(() => pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.envelopeType === "EVERYDAY") || pools[0], [pools]);

  const linesWithType = useMemo(
    () => lines.map((l) => ({ ...l, envelopeType: pools.find((p) => p.id === l.bucketId)?.envelopeType })),
    [lines, pools]
  );

  const summary = useMemo(
    () => computePaydayAllocationSummary(numericActual, sweepPool?.id, linesWithType, linesMap),
    [numericActual, sweepPool?.id, linesWithType, linesMap]
  );

  const isReadOnly = isConfirmedPlan;
  const todayStr = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: activeTz }).format(new Date()), [activeTz]);
  const isFutureDate = selectedDate > todayStr;

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const pData = previewQuery.data;
    if (sourceName !== (pData.incomeEventName || "Paycheck")) return true;
    if (Math.abs((parseFloat(actualAmount) || 0) - Number(pData.actualAmount ?? pData.expectedAmount ?? 0)) > 0.009) return true;
    if (selectedDate !== (pData.expectedDate || "")) return true;
    for (const [pId, val] of Object.entries(linesMap)) {
      if (Math.abs((parseFloat(val || "0")) - parseFloat(initialLinesMap[pId] || "0")) > 0.009) return true;
    }
    for (const [pId, val] of Object.entries(reasoningMap)) {
      if ((initialReasoningMap[pId] || "") !== (val || "")) return true;
    }
    return false;
  }, [previewQuery.data, sourceName, actualAmount, selectedDate, linesMap, initialLinesMap, reasoningMap, initialReasoningMap]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    const cleaned = sanitizeDecimalInput(val);
    setLinesMap((prev) => ({ ...prev, [bucketId]: cleaned }));
    if ((parseFloat(cleaned) || 0) <= 0) setReasoningMap((prev) => ({ ...prev, [bucketId]: "" }));
  };

  const handleLineReasoningChange = (bucketId: string, reasoning: string) => {
    const currentVal = bucketId === sweepPool?.id ? summary.sweepPoolRemainder : parseFloat(linesMap[bucketId] ?? "0") || 0;
    if (currentVal <= 0) return;
    setReasoningMap((prev) => ({ ...prev, [bucketId]: reasoning }));
  };

  const actions = usePaydayPlanActions({
    incomeEventId, sourceName, actualAmount, selectedDate, numericActual, lines,
    linesMap, setLinesMap, initialLinesMap, setInitialLinesMap,
    reasoningMap, setReasoningMap, initialReasoningMap, setInitialReasoningMap,
    sweepPool, sweepPoolRemainder: summary.sweepPoolRemainder, isDeficit: summary.isDeficit,
    isReadOnly, isFutureDate, isSavedPlan, setIsSavedPlan, submitting, setSubmitting,
    setShowConfirmWarning, setShowDeleteConfirm, setShowRecalculateConfirm, setShowExitDialog,
    setShowTransferModal, setCelebrationTargets, returnTo, previewData: previewQuery.data, applyPreviewData,
    setSourceName, setActualAmount, setSelectedDate,
  });

  const attemptExit = useCallback(() => {
    if (isDirty && !isReadOnly) { setShowExitDialog(true); return; }
    router.push(returnTo);
  }, [isDirty, isReadOnly, router, returnTo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showConfirmWarning && !showDeleteConfirm && !showRecalculateConfirm && !showExitDialog) attemptExit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConfirmWarning, showDeleteConfirm, showRecalculateConfirm, showExitDialog, attemptExit]);

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: "EVERYDAY" | "BILL" | "GOAL"; label: string; items: AllocationLineItem[] }> = [
      { type: "EVERYDAY", label: t("paydayDrawer.everydayPools"), items: [] },
      { type: "BILL", label: t("paydayDrawer.billsPools"), items: [] },
      { type: "GOAL", label: t("paydayDrawer.goalsPools"), items: [] },
    ];
    for (const l of lines) {
      const et = pools.find((pool) => pool.id === l.bucketId)?.envelopeType;
      if (et === "EVERYDAY") groups[0].items.push(l);
      else if (et === "GOAL") groups[2].items.push(l);
      else groups[1].items.push(l);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  return {
    poolsQuery, previewQuery, bankAccountsQuery, pools, bankAccounts, receivingAccountId,
    actualAmount, setActualAmount, sourceName, setSourceName, selectedDate, setSelectedDate,
    linesMap, initialLinesMap, reasoningMap, numericActual, sweepPool,
    sweepPoolRemainder: summary.sweepPoolRemainder, isDeficit: summary.isDeficit,
    isReadOnly, isSavedPlan, isConfirmedPlan, isFutureDate, isDirty, submitting,
    everydayAllocated: summary.everydayAllocated, billsAllocated: summary.billsAllocated, goalsAllocated: summary.goalsAllocated,
    groupedLines, showConfirmWarning, setShowConfirmWarning, showDeleteConfirm, setShowDeleteConfirm,
    showRecalculateConfirm, setShowRecalculateConfirm, showExitDialog, setShowExitDialog,
    activeDrawerPool, setActiveDrawerPool, poolToEdit, setPoolToEdit, isPoolModalOpen, setIsPoolModalOpen,
    showTableDetails, setShowTableDetails, showTransferModal, setShowTransferModal, celebrationTargets,
    handleLineAmountChange, handleLineReasoningChange, attemptExit,
    handleRecalculateTrigger: () => setShowRecalculateConfirm(true),
    ...actions,
  };
}
