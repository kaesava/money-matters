import { useState, useEffect, useMemo } from "react";
import { parseRecurrenceRule, buildRecurrenceRule, RecurrenceFrequency } from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { formatIsoDate } from "../../../lib/format";
import type { EnvelopeItem } from "../../EnvelopeFormModal";

export interface UseMobileEnvelopeFormStateParams {
  categoryToEdit?: EnvelopeItem | null;
  defaultType?: "GOAL" | "BILL" | "EVERYDAY";
  visible: boolean;
  bankAccounts: Array<{ id: string; name: string; isPrivate?: boolean | null }>;
}

export function useMobileEnvelopeFormState({
  categoryToEdit,
  defaultType,
  visible,
  bankAccounts,
}: UseMobileEnvelopeFormStateParams) {
  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [type, setType] = useState<"GOAL" | "BILL" | "EVERYDAY">(
    defaultType === "GOAL" ? "GOAL" : defaultType === "EVERYDAY" ? "EVERYDAY" : "BILL"
  );
  const [safetyBufferFloor, setSafetyBufferFloor] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [fundingMode, setFundingMode] = useState<"RECURRING" | "TARGET_BALANCE">("RECURRING");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [interval, setInterval] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [isPriority, setIsPriority] = useState(false);
  const [generateEvents, setGenerateEvents] = useState(true);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      const rawEnvelopeType =
        categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "BILL";
      const resolvedType: "GOAL" | "BILL" | "EVERYDAY" =
        rawEnvelopeType === "EVERYDAY"
          ? "EVERYDAY"
          : rawEnvelopeType === "GOAL" || rawEnvelopeType.includes("GOAL")
          ? "GOAL"
          : "BILL";
      setType(resolvedType);
      const resolvedFundingMode: "RECURRING" | "TARGET_BALANCE" =
        categoryToEdit.fundingMode ?? (resolvedType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
      setFundingMode(resolvedFundingMode);
      setBankAccountId(categoryToEdit.bankAccountId ?? "");
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor ?? "");
      setTargetAmount((categoryToEdit.enteredAmount || categoryToEdit.targetAmount || categoryToEdit.monthlyAmount) ?? "");
      const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
      setTargetDate(rawDate ? formatIsoDate(rawDate) : "");
      const parsedRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
      setFrequency(parsedRecurrence.frequency);
      setInterval(parsedRecurrence.interval);
      const rawStartDate = categoryToEdit.startDate || "";
      setGoalStartDate(rawStartDate ? formatIsoDate(rawStartDate) : "");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
      const initialPriority = categoryToEdit.isPriority ?? false;
      setIsPriority(initialPriority);
      const isInitialScheduled = resolvedType === "BILL" && resolvedFundingMode === "RECURRING";
      setGenerateEvents(categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? isInitialScheduled);
    } else {
      setName("");
      const resolvedDefault = defaultType === "GOAL" ? "GOAL" : defaultType === "EVERYDAY" ? "EVERYDAY" : "BILL";
      setType(resolvedDefault);
      setFundingMode(resolvedDefault === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
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
    setNameError("");
  }, [categoryToEdit, defaultType, visible, bankAccounts]);

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
      if (fundingMode === "RECURRING" && goalStartDate && targetDate && targetDate < goalStartDate) return false;
    }
    if (type === "BILL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (fundingMode === "RECURRING") {
        if (!goalStartDate) return false;
        if (targetDate && targetDate < goalStartDate) return false;
      }
    }
    return true;
  }, [name, isEdit, bankAccountId, type, fundingMode, targetAmount, targetDate, goalStartDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(
        name.trim() ||
          bankAccountId ||
          safetyBufferFloor.trim() ||
          targetAmount.trim() ||
          targetDate ||
          isSurplusTarget ||
          isPriority ||
          type !== (defaultType || "BILL") ||
          fundingMode !== (type === "GOAL" ? "TARGET_BALANCE" : "RECURRING") ||
          frequency !== "MONTHLY" ||
          interval !== 1 ||
          (type === "BILL" && fundingMode === "RECURRING" && !generateEvents)
      );
    }
    if (!categoryToEdit) return false;
    const initialName = (categoryToEdit.name || "").trim();
    const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "BILL";
    const initialType: "GOAL" | "BILL" | "EVERYDAY" =
      rawType === "EVERYDAY" ? "EVERYDAY" : rawType === "GOAL" || rawType.includes("GOAL") ? "GOAL" : "BILL";
    const initialFundingMode: "RECURRING" | "TARGET_BALANCE" =
      categoryToEdit.fundingMode ?? (initialType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
    const initialTarget = ((categoryToEdit.enteredAmount || categoryToEdit.targetAmount) ?? "").trim();
    const initialFloor = (categoryToEdit.safetyBufferFloor ?? "").trim();
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? formatIsoDate(rawDate) : "";
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;
    const initialPriority = categoryToEdit.isPriority ?? false;
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? formatIsoDate(rawStartDate) : "";
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
    name,
    bankAccountId,
    safetyBufferFloor,
    targetAmount,
    targetDate,
    fundingMode,
    frequency,
    interval,
    goalStartDate,
    isSurplusTarget,
    isPriority,
    type,
    defaultType,
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
    const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "BILL";
    const isInitialScheduled = rawType === "BILL" && categoryToEdit.fundingMode === "RECURRING";
    return categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? isInitialScheduled;
  }, [isEdit, categoryToEdit]);

  const isScheduleRuleChanged = useMemo(() => {
    if (!isEdit || !categoryToEdit) return false;
    const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "BILL";
    const initialType: "GOAL" | "BILL" | "EVERYDAY" =
      rawType === "EVERYDAY" ? "EVERYDAY" : rawType === "GOAL" || rawType.includes("GOAL") ? "GOAL" : "BILL";
    const initialFundingMode: "RECURRING" | "TARGET_BALANCE" =
      categoryToEdit.fundingMode ?? (initialType === "GOAL" ? "TARGET_BALANCE" : "RECURRING");
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? formatIsoDate(rawStartDate) : "";
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? formatIsoDate(rawDate) : "";
    const initialGenerate = categoryToEdit.generateEvents ?? categoryToEdit.hasScheduledEvents ?? (initialType === "BILL" && initialFundingMode === "RECURRING");

    const isCurrentScheduled = (type === "BILL") && fundingMode === "RECURRING";
    const wasScheduled = initialFundingMode === "RECURRING";

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
    const isScheduledBill = (type === "BILL") && fundingMode === "RECURRING";
    const isFlexibleBill = (type === "BILL") && fundingMode === "TARGET_BALANCE";
    const isOngoingGoal = type === "GOAL" && fundingMode === "RECURRING";
    const isTargetGoal = type === "GOAL" && fundingMode === "TARGET_BALANCE";

    const finalTargetAmount =
      isTargetGoal || isFlexibleBill ? parseFloat(targetAmount).toFixed(2) : undefined;

    const enteredAmountVal =
      isScheduledBill || isFlexibleBill || isOngoingGoal ? parseFloat(targetAmount).toFixed(2) : undefined;

    const canonicalEnvelopeType: "EVERYDAY" | "BILL" | "GOAL" =
      type === "EVERYDAY" ? "EVERYDAY" : type === "GOAL" ? "GOAL" : "BILL";

    const effectiveFundingMode: "TARGET_BALANCE" | "RECURRING" | undefined =
      type === "EVERYDAY" ? undefined : fundingMode;

    return {
      name: name.trim(),
      envelopeType: canonicalEnvelopeType,
      fundingMode: effectiveFundingMode,
      safetyBufferFloor: type === "EVERYDAY" ? safetyBufferFloor || "0.00" : undefined,
      targetAmount: finalTargetAmount,
      monthlyAmount: isFlexibleBill
        ? finalTargetAmount
        : isScheduledBill || isOngoingGoal
        ? calculatedMonthly
        : undefined,
      enteredAmount: enteredAmountVal,
      endDate: (isTargetGoal || isScheduledBill || isOngoingGoal) ? (targetDate || null) : null,
      budgetFrequency: isScheduledBill || isOngoingGoal ? frequency : isFlexibleBill ? ("MONTHLY" as const) : undefined,
      startDate: isScheduledBill || isOngoingGoal ? goalStartDate || undefined : undefined,
      rrule: isScheduledBill || isOngoingGoal ? rruleString || undefined : undefined,
      isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
      isPriority: type !== "EVERYDAY" ? isPriority : false,
      generateEvents: isScheduledBill ? generateEvents : false,
    };
  };

  return {
    isEdit,
    name,
    setName,
    nameError,
    setNameError,
    type,
    setType,
    safetyBufferFloor,
    setSafetyBufferFloor,
    targetAmount,
    setTargetAmount,
    targetDate,
    setTargetDate,
    isTargetDateInPast,
    isPastStartDate,
    fundingMode,
    setFundingMode,
    frequency,
    setFrequency,
    interval,
    setInterval,
    goalStartDate,
    setGoalStartDate,
    bankAccountId,
    setBankAccountId,
    isSurplusTarget,
    setIsSurplusTarget,
    isPriority,
    setIsPriority,
    generateEvents,
    setGenerateEvents,
    calculatedMonthly,
    isValid,
    isDirty,
    initialGenerateEvents,
    isScheduleRuleChanged,
    buildPayload,
  };
}
