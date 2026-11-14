"use client";

import { useState, useEffect, useMemo } from "react";
import { parseRecurrenceRule, buildRecurrenceRule, RecurrenceFrequency } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface EnvelopeModalItem {
  id: string;
  poolId?: string;
  name: string;
  type?: "EVERYDAY" | "BILL" | "GOAL" | string;
  envelopeType?: string;
  fundingMode?: "TARGET_BALANCE" | "RECURRING" | null;
  bankAccountId?: string | null;
  isPrivate?: boolean | null;
  monthlyAmount?: string | null;
  safetyBufferFloor?: string | null;
  targetAmount?: string | null;
  endDate?: string | null;
  targetDate?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | string | null;
  startDate?: string | null;
  rrule?: string | null;
  isSurplusTarget?: boolean | null;
  generateEvents?: boolean | null;
  hasScheduledEvents?: boolean | null;
  isPriority?: boolean | null;
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
  const [type, setType] = useState<"EVERYDAY" | "BILL" | "GOAL">("BILL");
  const [fundingMode, setFundingMode] = useState<"RECURRING" | "TARGET_BALANCE">("RECURRING");
  const [bankAccountId, setBankAccountId] = useState("");
  const [safetyBufferFloor, setSafetyBufferFloor] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [interval, setInterval] = useState<number>(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [isPriority, setIsPriority] = useState(false);
  const [generateEvents, setGenerateEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRuleChangeConfirm, setShowRuleChangeConfirm] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      const rawType = categoryToEdit.envelopeType || categoryToEdit.type || "BILL";
      const resolvedType: "EVERYDAY" | "BILL" | "GOAL" =
        rawType === "EVERYDAY" ? "EVERYDAY" : rawType === "GOAL" ? "GOAL" : "BILL";
      setType(resolvedType);

      const resolvedFundingMode: "RECURRING" | "TARGET_BALANCE" =
        categoryToEdit.fundingMode ??
        (resolvedType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
      setFundingMode(resolvedFundingMode);

      setBankAccountId(categoryToEdit.bankAccountId || "");
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor || "");
      setTargetAmount(
        categoryToEdit.enteredAmount || categoryToEdit.targetAmount || categoryToEdit.monthlyAmount || ""
      );
      const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
      setTargetDate(rawDate ? rawDate.split("T")[0] : "");
      const parsedRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
      setFrequency(parsedRecurrence.frequency);
      setInterval(parsedRecurrence.interval);
      const rawStartDate = categoryToEdit.startDate || "";
      setGoalStartDate(rawStartDate ? rawStartDate.split("T")[0] : "");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
      setIsPriority(categoryToEdit.isPriority ?? false);
      const isInitialScheduled = resolvedType === "BILL" && resolvedFundingMode === "RECURRING";
      setGenerateEvents(categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? isInitialScheduled);
    } else {
      setName("");
      setType("BILL");
      setFundingMode("RECURRING");
      setBankAccountId(bankAccounts[0]?.id || "");
      setSafetyBufferFloor("");
      setTargetAmount("");
      setTargetDate("");
      setFrequency("MONTHLY");
      setInterval(1);
      setGoalStartDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
      setIsSurplusTarget(false);
      setIsPriority(false);
      setGenerateEvents(true);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen, bankAccounts]);

  useEffect(() => {
    if (!isEdit && bankAccounts.length > 0) {
      if (type === "BILL" || type === "EVERYDAY") {
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
    else if (frequency === "QUARTERLY") monthly = (val * (4 / intVal)) / 12;
    else if (frequency === "ANNUALLY") monthly = val / (12 * intVal);
    return monthly.toFixed(2);
  }, [targetAmount, frequency, interval]);

  const rruleString = useMemo(() => {
    const isRecurring = (type === "BILL" || type === "GOAL") && fundingMode === "RECURRING";
    if (!isRecurring) return null;
    return buildRecurrenceRule(frequency, interval);
  }, [type, fundingMode, frequency, interval]);

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !bankAccountId) return false;
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (fundingMode === "TARGET_BALANCE" && !targetDate) return false;
    }
    if (type === "BILL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (fundingMode === "RECURRING" && !goalStartDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, fundingMode, targetAmount, targetDate, goalStartDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      const defaultBankAccountId = bankAccounts[0]?.id || "";
      return Boolean(
        name.trim() ||
          bankAccountId !== defaultBankAccountId ||
          safetyBufferFloor.trim() ||
          targetAmount.trim() ||
          targetDate ||
          isSurplusTarget ||
          isPriority ||
          type !== "BILL" ||
          fundingMode !== "RECURRING" ||
          frequency !== "MONTHLY" ||
          interval !== 1 ||
          (type === "BILL" && fundingMode === "RECURRING" && !generateEvents)
      );
    }
    if (!categoryToEdit) return false;
    const initialName = (categoryToEdit.name || "").trim();
    const rawType = categoryToEdit.envelopeType || categoryToEdit.type || "BILL";
    const initialType: "EVERYDAY" | "BILL" | "GOAL" =
      rawType === "EVERYDAY" ? "EVERYDAY" : rawType === "GOAL" ? "GOAL" : "BILL";
    const initialFundingMode: "RECURRING" | "TARGET_BALANCE" =
      categoryToEdit.fundingMode ?? (initialType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
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
    const initialPriority = categoryToEdit.isPriority ?? false;
    const initialGenerate = categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? (initialType === "BILL" && initialFundingMode === "RECURRING");

    if (name.trim() !== initialName) return true;
    if (isSurplusTarget !== initialSurplus) return true;
    if (isPriority !== initialPriority) return true;
    if (type !== initialType) return true;
    if (fundingMode !== initialFundingMode) return true;

    if (type === "EVERYDAY") {
      return safetyBufferFloor.trim() !== initialFloor;
    }

    if (type === "BILL") {
      if (targetAmount.trim() !== initialTarget) return true;
      if (fundingMode === "RECURRING") {
        if (frequency !== initialFreq) return true;
        if (interval !== initialInterval) return true;
        if (goalStartDate !== initialStartDate) return true;
        if (targetDate !== initialDate) return true;
        if (generateEvents !== initialGenerate) return true;
      }
      return false;
    }

    if (type === "GOAL") {
      if (targetAmount.trim() !== initialTarget) return true;
      if (fundingMode === "TARGET_BALANCE") {
        return targetDate !== initialDate;
      }
      if (fundingMode === "RECURRING") {
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
    bankAccounts,
    name,
    bankAccountId,
    safetyBufferFloor,
    targetAmount,
    targetDate,
    fundingMode,
    frequency,
    interval,
    isPriority,
    goalStartDate,
    isSurplusTarget,
    type,
    generateEvents,
  ]);

  const todayStr = useMemo(() => new Intl.DateTimeFormat("en-CA").format(new Date()), []);
  const isTargetDateInPast = useMemo(() => {
    return Boolean(type === "GOAL" && fundingMode === "TARGET_BALANCE" && targetDate && targetDate < todayStr);
  }, [type, fundingMode, targetDate, todayStr]);

  const isPastStartDate = useMemo(() => {
    return Boolean(goalStartDate && goalStartDate < todayStr);
  }, [goalStartDate, todayStr]);

  const initialGenerateEvents = useMemo(() => {
    if (!isEdit || !categoryToEdit) return true;
    const rawType = categoryToEdit.envelopeType || categoryToEdit.type || "BILL";
    const isInitialScheduled = rawType === "BILL" && categoryToEdit.fundingMode === "RECURRING";
    return categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? isInitialScheduled;
  }, [isEdit, categoryToEdit]);

  const validateForm = (): string | null => {
    if (!name.trim()) return t("categories.nameRequired");
    if (!isEdit && !bankAccountId) return t("categories.bankAccountRequired");
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return t("categories.goalAmountRequired");
      if (fundingMode === "TARGET_BALANCE" && !targetDate) return t("categories.goalDateRequired");
      if (fundingMode === "RECURRING" && goalStartDate && targetDate && targetDate < goalStartDate) {
        return t("categories.endDateBeforeStartDate");
      }
    }
    if (type === "BILL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return t("categories.billAmountRequired");
      if (fundingMode === "RECURRING") {
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
    const rawType = categoryToEdit.envelopeType || categoryToEdit.type || "BILL";
    const initialType =
      rawType === "EVERYDAY" ? "EVERYDAY" : rawType === "GOAL" ? "GOAL" : "BILL";
    const initialFundingMode: "RECURRING" | "TARGET_BALANCE" =
      categoryToEdit.fundingMode ?? (initialType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? rawStartDate.split("T")[0] : "";
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? rawDate.split("T")[0] : "";
    const initialGenerate = categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? (initialType === "BILL" && initialFundingMode === "RECURRING");

    const isCurrentScheduled = type === "BILL" && fundingMode === "RECURRING";
    const wasScheduled = initialType === "BILL" && initialFundingMode === "RECURRING";

    if (type === "BILL" && (isCurrentScheduled || wasScheduled)) {
      if (fundingMode !== initialFundingMode) return true;
      if (frequency !== initialFreq) return true;
      if (interval !== initialInterval) return true;
      if ((goalStartDate || "") !== initialStartDate) return true;
      if ((targetDate || "") !== initialDate) return true;
      if (generateEvents !== initialGenerate) return true;
    }
    return false;
  }, [isEdit, categoryToEdit, type, fundingMode, frequency, interval, goalStartDate, targetDate, generateEvents]);

  const buildPayload = () => {
    const isRecurringBill = type === "BILL" && fundingMode === "RECURRING";
    const isTargetBalanceBill = type === "BILL" && fundingMode === "TARGET_BALANCE";
    const isRecurringGoal = type === "GOAL" && fundingMode === "RECURRING";
    const isTargetGoal = type === "GOAL" && fundingMode === "TARGET_BALANCE";

    const finalTargetAmount =
      isTargetGoal || isTargetBalanceBill ? parseFloat(targetAmount).toFixed(2) : undefined;

    const enteredAmountVal =
      isRecurringBill || isTargetBalanceBill || isRecurringGoal ? parseFloat(targetAmount).toFixed(2) : undefined;

    return {
      name: name.trim(),
      envelopeType: type,
      fundingMode: type === "EVERYDAY" ? undefined : fundingMode,
      isPriority,
      safetyBufferFloor: type === "EVERYDAY" ? safetyBufferFloor || "0.00" : undefined,
      targetAmount: finalTargetAmount,
      monthlyAmount: isTargetBalanceBill
        ? finalTargetAmount
        : isRecurringBill || isRecurringGoal
        ? calculatedMonthly
        : undefined,
      enteredAmount: enteredAmountVal,
      endDate: (isTargetGoal || isRecurringBill || isRecurringGoal) ? (targetDate || null) : null,
      budgetFrequency: isRecurringBill || isRecurringGoal ? frequency : isTargetBalanceBill ? ("MONTHLY" as const) : undefined,
      startDate: isRecurringBill || isRecurringGoal ? goalStartDate || undefined : undefined,
      rrule: isRecurringBill || isRecurringGoal ? rruleString || undefined : undefined,
      isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
      generateEvents: isRecurringBill ? generateEvents : false,
    };
  };

  return {
    isEdit,
    name,
    setName,
    type,
    setType,
    fundingMode,
    setFundingMode,
    bankAccountId,
    setBankAccountId,
    safetyBufferFloor,
    setSafetyBufferFloor,
    targetAmount,
    setTargetAmount,
    targetDate,
    setTargetDate,
    isTargetDateInPast,
    isPastStartDate,
    frequency,
    setFrequency,
    interval,
    setInterval,
    goalStartDate,
    setGoalStartDate,
    isSurplusTarget,
    setIsSurplusTarget,
    isPriority,
    setIsPriority,
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
