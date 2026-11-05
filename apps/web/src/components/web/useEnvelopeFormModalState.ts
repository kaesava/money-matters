"use client";

import { useState, useEffect, useMemo } from "react";
import { parseRecurrenceRule, buildRecurrenceRule } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface EnvelopeModalItem {
  id: string;
  poolId?: string;
  name: string;
  type?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
  poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
  envelopeType?: string;
  bankAccountId?: string | null;
  isPrivate?: boolean | null;
  monthlyAmount?: string | null;
  safetyBufferFloor?: string | null;
  targetAmount?: string | null;
  endDate?: string | null;
  targetDate?: string | null;
  goalMode?: "TARGET_DATE" | "ONGOING" | null;
  enteredAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | string | null;
  startDate?: string | null;
  rrule?: string | null;
  isSurplusTarget?: boolean | null;
  hasScheduledEvents?: boolean | null;
}

export interface UseEnvelopeFormModalStateParams {
  isOpen: boolean;
  categoryToEdit?: EnvelopeModalItem | null;
  bankAccounts: Array<{ id: string; name: string; isPrivate?: boolean | null }>;
}

export function useEnvelopeFormModalState({
  isOpen,
  categoryToEdit,
  bankAccounts,
}: UseEnvelopeFormModalStateParams) {
  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [type, setType] = useState<"EVERYDAY" | "REGULAR" | "GOAL">("REGULAR");
  const [billMode, setBillMode] = useState<"SCHEDULED_BILL" | "FLEXIBLE_BILL">("SCHEDULED_BILL");
  const [bankAccountId, setBankAccountId] = useState("");
  const [safetyBufferFloor, setSafetyBufferFloor] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalMode, setGoalMode] = useState<"TARGET_DATE" | "ONGOING">("TARGET_DATE");
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");
  const [interval, setInterval] = useState<number>(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [generateEvents, setGenerateEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRuleChangeConfirm, setShowRuleChangeConfirm] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
      const resolvedType: "EVERYDAY" | "REGULAR" | "GOAL" =
        rawType === "EVERYDAY"
          ? "EVERYDAY"
          : rawType === "TARGET_GOAL" || rawType === "ONGOING_GOAL" || rawType.includes("GOAL")
          ? "GOAL"
          : "REGULAR";
      setType(resolvedType);
      setBillMode(rawType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL");
      setBankAccountId(categoryToEdit.bankAccountId || "");
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor || "");
      setTargetAmount(
        categoryToEdit.enteredAmount || categoryToEdit.targetAmount || categoryToEdit.monthlyAmount || ""
      );
      const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
      setTargetDate(rawDate ? rawDate.split("T")[0] : "");
      setGoalMode(categoryToEdit.goalMode === "ONGOING" || rawType === "ONGOING_GOAL" ? "ONGOING" : "TARGET_DATE");
      const parsedRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
      setFrequency(parsedRecurrence.frequency);
      setInterval(parsedRecurrence.interval);
      const rawStartDate = categoryToEdit.startDate || "";
      setGoalStartDate(rawStartDate ? rawStartDate.split("T")[0] : "");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
      const isInitialScheduled =
        (categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR") ===
        "SCHEDULED_BILL";
      setGenerateEvents(categoryToEdit.hasScheduledEvents ?? isInitialScheduled);
    } else {
      setName("");
      setType("REGULAR");
      setBillMode("SCHEDULED_BILL");
      setBankAccountId(bankAccounts[0]?.id || "");
      setSafetyBufferFloor("");
      setTargetAmount("");
      setTargetDate("");
      setGoalMode("TARGET_DATE");
      setFrequency("MONTHLY");
      setInterval(1);
      setGoalStartDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
      setIsSurplusTarget(false);
      setGenerateEvents(true);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen, bankAccounts]);

  useEffect(() => {
    if (!isEdit && bankAccounts.length > 0) {
      if (type === "REGULAR" || type === "EVERYDAY") {
        setBankAccountId(bankAccounts[0]?.id || "");
      }
    }
  }, [type, isEdit, bankAccounts]);

  const calculatedMonthly = useMemo(() => {
    const val = parseFloat(targetAmount);
    if (isNaN(val) || val <= 0) return "0.00";
    const intVal = Math.max(1, interval);
    let monthly = val;
    if (frequency === "WEEKLY") monthly = (val * (52 / intVal)) / 12;
    else if (frequency === "FORTNIGHTLY") monthly = (val * (26 / intVal)) / 12;
    else if (frequency === "MONTHLY") monthly = val / intVal;
    else if (frequency === "ANNUALLY") monthly = val / (12 * intVal);
    return monthly.toFixed(2);
  }, [targetAmount, frequency, interval]);

  const rruleString = useMemo(() => {
    const isScheduledBill = type === "REGULAR" && billMode === "SCHEDULED_BILL";
    const isOngoingGoal = type === "GOAL" && goalMode === "ONGOING";
    if (!isScheduledBill && !isOngoingGoal) return null;
    return buildRecurrenceRule(frequency, interval);
  }, [type, billMode, goalMode, frequency, interval]);

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !bankAccountId) return false;
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (goalMode === "TARGET_DATE" && !targetDate) return false;
    }
    if (type === "REGULAR") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (billMode === "SCHEDULED_BILL" && !goalStartDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, billMode, targetAmount, goalMode, targetDate, goalStartDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(
        name.trim() ||
          bankAccountId ||
          safetyBufferFloor.trim() ||
          targetAmount.trim() ||
          targetDate ||
          isSurplusTarget ||
          type !== "REGULAR" ||
          billMode !== "SCHEDULED_BILL" ||
          goalMode !== "TARGET_DATE" ||
          frequency !== "MONTHLY" ||
          interval !== 1 ||
          (billMode === "SCHEDULED_BILL" && !generateEvents)
      );
    }
    if (!categoryToEdit) return false;
    const initialName = (categoryToEdit.name || "").trim();
    const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
    const initialBillMode = rawType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL";
    const initialGoalMode =
      categoryToEdit.goalMode === "ONGOING" || rawType === "ONGOING_GOAL" ? "ONGOING" : "TARGET_DATE";
    const initialFloor = (categoryToEdit.safetyBufferFloor || "").trim();
    const initialTarget = (
      categoryToEdit.enteredAmount ||
      categoryToEdit.targetAmount ||
      categoryToEdit.monthlyAmount ||
      ""
    ).trim();
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? rawDate.split("T")[0] : "";
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? rawStartDate.split("T")[0] : "";
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;
    const initialGenerate = categoryToEdit.hasScheduledEvents ?? (initialBillMode === "SCHEDULED_BILL");

    if (name.trim() !== initialName) return true;
    if (isSurplusTarget !== initialSurplus) return true;

    if (type === "EVERYDAY") {
      return safetyBufferFloor.trim() !== initialFloor;
    }

    if (type === "REGULAR") {
      if (billMode !== initialBillMode) return true;
      if (targetAmount.trim() !== initialTarget) return true;
      if (billMode === "SCHEDULED_BILL") {
        if (frequency !== initialFreq) return true;
        if (interval !== initialInterval) return true;
        if (goalStartDate !== initialStartDate) return true;
        if (targetDate !== initialDate) return true;
        if (generateEvents !== initialGenerate) return true;
      }
      return false;
    }

    if (type === "GOAL") {
      if (goalMode !== initialGoalMode) return true;
      if (targetAmount.trim() !== initialTarget) return true;
      if (goalMode === "TARGET_DATE") {
        return targetDate !== initialDate;
      }
      if (goalMode === "ONGOING") {
        if (frequency !== initialFreq) return true;
        if (interval !== initialInterval) return true;
        if (goalStartDate !== initialStartDate) return true;
        if (targetDate !== initialDate) return true;
      }
      return false;
    }

    return false;
  }, [
    isEdit,
    categoryToEdit,
    name,
    billMode,
    bankAccountId,
    safetyBufferFloor,
    targetAmount,
    targetDate,
    goalMode,
    frequency,
    interval,
    goalStartDate,
    isSurplusTarget,
    type,
    generateEvents,
  ]);

  const todayStr = useMemo(() => new Intl.DateTimeFormat("en-CA").format(new Date()), []);
  const isTargetDateInPast = useMemo(() => {
    return Boolean(type === "GOAL" && goalMode === "TARGET_DATE" && targetDate && targetDate < todayStr);
  }, [type, goalMode, targetDate, todayStr]);

  const initialGenerateEvents = useMemo(() => {
    if (!isEdit || !categoryToEdit) return true;
    const isInitialScheduled =
      (categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR") ===
      "SCHEDULED_BILL";
    return categoryToEdit.hasScheduledEvents ?? isInitialScheduled;
  }, [isEdit, categoryToEdit]);

  const validateForm = (): string | null => {
    if (!name.trim()) return t("categories.nameRequired");
    if (!isEdit && !bankAccountId) return t("categories.bankAccountRequired");
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return t("categories.goalAmountRequired");
      if (goalMode === "TARGET_DATE" && !targetDate) return t("categories.goalDateRequired");
      if (goalMode === "ONGOING" && goalStartDate && targetDate && targetDate < goalStartDate) {
        return t("categories.endDateBeforeStartDate");
      }
    }
    if (type === "REGULAR") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return t("categories.billAmountRequired");
      if (billMode === "SCHEDULED_BILL") {
        if (!goalStartDate) return t("categories.billStartDateRequired");
        if (targetDate && targetDate < goalStartDate) {
          return t("categories.endDateBeforeStartDate");
        }
      }
    }
    return null;
  };

  const isScheduleRuleChanged = useMemo(() => {
    if (!isEdit || !categoryToEdit) return false;
    const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
    const initialBillMode = rawType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL";
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? rawStartDate.split("T")[0] : "";
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? rawDate.split("T")[0] : "";
    const initialGenerate = categoryToEdit.hasScheduledEvents ?? (initialBillMode === "SCHEDULED_BILL");

    const isCurrentScheduled = type === "REGULAR" && billMode === "SCHEDULED_BILL";
    const wasScheduled = initialBillMode === "SCHEDULED_BILL";

    if (type === "REGULAR" && (isCurrentScheduled || wasScheduled)) {
      if (billMode !== initialBillMode) return true;
      if (frequency !== initialFreq) return true;
      if (interval !== initialInterval) return true;
      if ((goalStartDate || "") !== initialStartDate) return true;
      if ((targetDate || "") !== initialDate) return true;
      if (generateEvents !== initialGenerate) return true;
    }
    return false;
  }, [isEdit, categoryToEdit, type, billMode, frequency, interval, goalStartDate, targetDate, generateEvents]);

  const buildPayload = () => {
    const isScheduledBill = type === "REGULAR" && billMode === "SCHEDULED_BILL";
    const isFlexibleBill = type === "REGULAR" && billMode === "FLEXIBLE_BILL";
    const isOngoingGoal = type === "GOAL" && goalMode === "ONGOING";
    const isTargetGoal = type === "GOAL" && goalMode === "TARGET_DATE";

    const finalTargetAmount =
      isTargetGoal || isFlexibleBill ? parseFloat(targetAmount).toFixed(2) : undefined;

    const enteredAmountVal =
      isScheduledBill || isFlexibleBill || isOngoingGoal ? parseFloat(targetAmount).toFixed(2) : undefined;

    const envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL" =
      type === "EVERYDAY"
        ? "EVERYDAY"
        : type === "GOAL"
        ? goalMode === "ONGOING"
          ? "ONGOING_GOAL"
          : "TARGET_GOAL"
        : billMode === "FLEXIBLE_BILL"
        ? "FLEXIBLE_BILL"
        : "SCHEDULED_BILL";

    return {
      name: name.trim(),
      envelopeType,
      safetyBufferFloor: type === "EVERYDAY" ? safetyBufferFloor || "0.00" : undefined,
      targetAmount: finalTargetAmount,
      monthlyAmount: isFlexibleBill
        ? finalTargetAmount
        : isScheduledBill || isOngoingGoal
        ? calculatedMonthly
        : undefined,
      enteredAmount: enteredAmountVal,
      endDate: (isTargetGoal || isScheduledBill || isOngoingGoal) ? (targetDate || undefined) : undefined,
      budgetFrequency: isScheduledBill || isOngoingGoal ? frequency : isFlexibleBill ? ("MONTHLY" as const) : undefined,
      startDate: isScheduledBill || isOngoingGoal ? goalStartDate || undefined : undefined,
      rrule: isScheduledBill || isOngoingGoal ? rruleString || undefined : undefined,
      goalMode: type === "GOAL" ? goalMode : undefined,
      isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
      generateEvents: isScheduledBill ? generateEvents : undefined,
    };
  };

  return {
    isEdit,
    name,
    setName,
    type,
    setType,
    billMode,
    setBillMode,
    bankAccountId,
    setBankAccountId,
    safetyBufferFloor,
    setSafetyBufferFloor,
    targetAmount,
    setTargetAmount,
    targetDate,
    setTargetDate,
    isTargetDateInPast,
    goalMode,
    setGoalMode,
    frequency,
    setFrequency,
    interval,
    setInterval,
    goalStartDate,
    setGoalStartDate,
    isSurplusTarget,
    setIsSurplusTarget,
    generateEvents,
    setGenerateEvents,
    submitting,
    setSubmitting,
    errorMsg,
    setErrorMsg,
    showArchiveConfirm,
    setShowArchiveConfirm,
    showRuleChangeConfirm,
    setShowRuleChangeConfirm,
    calculatedMonthly,
    rruleString,
    isValid,
    isDirty,
    initialGenerateEvents,
    validateForm,
    isScheduleRuleChanged,
    buildPayload,
  };
}
