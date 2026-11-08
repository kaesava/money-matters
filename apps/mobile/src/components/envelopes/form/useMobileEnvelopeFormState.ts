import { useState, useEffect, useMemo } from "react";
import { parseRecurrenceRule, buildRecurrenceRule, RecurrenceFrequency } from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { formatIsoDate } from "../../../lib/format";
import type { EnvelopeItem } from "../../EnvelopeFormModal";

export interface UseMobileEnvelopeFormStateParams {
  categoryToEdit?: EnvelopeItem | null;
  defaultType?: "GOAL" | "REGULAR" | "EVERYDAY";
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
  const [type, setType] = useState<"GOAL" | "REGULAR" | "EVERYDAY">(defaultType || "REGULAR");
  const [safetyBufferFloor, setSafetyBufferFloor] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalMode, setGoalMode] = useState<"TARGET_DATE" | "ONGOING">("TARGET_DATE");
  const [billMode, setBillMode] = useState<"SCHEDULED_BILL" | "FLEXIBLE_BILL">("SCHEDULED_BILL");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [interval, setInterval] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [isPriority, setIsPriority] = useState(false);
  const [isEssential, setIsEssential] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [generateEvents, setGenerateEvents] = useState(true);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      const rawEnvelopeType =
        categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
      const resolvedType: "GOAL" | "REGULAR" | "EVERYDAY" =
        rawEnvelopeType === "EVERYDAY"
          ? "EVERYDAY"
          : rawEnvelopeType === "TARGET_GOAL" ||
            rawEnvelopeType === "ONGOING_GOAL" ||
            rawEnvelopeType === "GOAL" ||
            rawEnvelopeType.includes("GOAL")
          ? "GOAL"
          : "REGULAR";
      setType(resolvedType);
      const resolvedBillMode: "SCHEDULED_BILL" | "FLEXIBLE_BILL" =
        rawEnvelopeType === "FLEXIBLE_BILL" || categoryToEdit.fundingMode === "TARGET_BALANCE" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL";
      setBillMode(resolvedBillMode);
      setBankAccountId(categoryToEdit.bankAccountId ?? "");
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor ?? "");
      setTargetAmount((categoryToEdit.enteredAmount || categoryToEdit.targetAmount) ?? "");
      const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
      setTargetDate(rawDate ? formatIsoDate(rawDate) : "");
      const resolvedGoalMode: "TARGET_DATE" | "ONGOING" =
        categoryToEdit.goalMode === "ONGOING" || rawEnvelopeType === "ONGOING_GOAL" || categoryToEdit.fundingMode === "RECURRING"
          ? "ONGOING"
          : "TARGET_DATE";
      setGoalMode(resolvedGoalMode);
      const parsedRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
      setFrequency(parsedRecurrence.frequency);
      setInterval(parsedRecurrence.interval);
      const rawStartDate = categoryToEdit.startDate || "";
      setGoalStartDate(rawStartDate ? formatIsoDate(rawStartDate) : "");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
      const initialPriority = categoryToEdit.isPriority ?? Boolean(categoryToEdit.isEssential || categoryToEdit.isCommitted);
      setIsPriority(initialPriority);
      setIsEssential(categoryToEdit.isEssential ?? initialPriority);
      setIsCommitted(categoryToEdit.isCommitted ?? initialPriority);
      const isInitialScheduled = rawEnvelopeType === "SCHEDULED_BILL" || (rawEnvelopeType === "BILL" && categoryToEdit.fundingMode === "RECURRING");
      setGenerateEvents(categoryToEdit.hasScheduledEvents ?? isInitialScheduled);
    } else {
      setName("");
      setType(defaultType || "REGULAR");
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
      setIsPriority(false);
      setIsEssential(false);
      setIsCommitted(false);
      setGenerateEvents(true);
    }
    setNameError("");
  }, [categoryToEdit, defaultType, visible, bankAccounts]);

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
      if (goalMode === "ONGOING" && goalStartDate && targetDate && targetDate < goalStartDate) return false;
    }
    if (type === "REGULAR") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (billMode === "SCHEDULED_BILL") {
        if (!goalStartDate) return false;
        if (targetDate && targetDate < goalStartDate) return false;
      }
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
          isEssential ||
          isCommitted ||
          type !== (defaultType || "REGULAR") ||
          billMode !== "SCHEDULED_BILL" ||
          goalMode !== "TARGET_DATE" ||
          frequency !== "MONTHLY" ||
          interval !== 1 ||
          (billMode === "SCHEDULED_BILL" && !generateEvents)
      );
    }
    if (!categoryToEdit) return false;
    const initialName = (categoryToEdit.name || "").trim();
    const initialTarget = ((categoryToEdit.enteredAmount || categoryToEdit.targetAmount) ?? "").trim();
    const initialFloor = (categoryToEdit.safetyBufferFloor ?? "").trim();
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? formatIsoDate(rawDate) : "";
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;
    const initialPriority = categoryToEdit.isPriority ?? Boolean(categoryToEdit.isEssential || categoryToEdit.isCommitted);
    const initialEssential = categoryToEdit.isEssential ?? initialPriority;
    const initialCommitted = categoryToEdit.isCommitted ?? initialPriority;
    const rawEnvelopeType =
      categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
    const initialGoalMode: "TARGET_DATE" | "ONGOING" =
      categoryToEdit.goalMode === "ONGOING" || rawEnvelopeType === "ONGOING_GOAL" ? "ONGOING" : "TARGET_DATE";
    const initialBillMode: "SCHEDULED_BILL" | "FLEXIBLE_BILL" =
      rawEnvelopeType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL";
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? formatIsoDate(rawStartDate) : "";
    const initialGenerate = categoryToEdit.hasScheduledEvents ?? (initialBillMode === "SCHEDULED_BILL");

    if (name.trim() !== initialName) return true;
    if (isSurplusTarget !== initialSurplus) return true;
    if (isPriority !== initialPriority) return true;

    if (type === "EVERYDAY") {
      return safetyBufferFloor.trim() !== initialFloor;
    }

    if (type === "REGULAR") {
      if (isEssential !== initialEssential) return true;
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
      if (isCommitted !== initialCommitted) return true;
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
    bankAccountId,
    safetyBufferFloor,
    targetAmount,
    targetDate,
    goalMode,
    billMode,
    frequency,
    interval,
    goalStartDate,
    isSurplusTarget,
    isPriority,
    isEssential,
    isCommitted,
    type,
    defaultType,
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
      "SCHEDULED_BILL" || (categoryToEdit.envelopeType === "BILL" && categoryToEdit.fundingMode === "RECURRING");
    return categoryToEdit.hasScheduledEvents ?? isInitialScheduled;
  }, [isEdit, categoryToEdit]);

  const isScheduleRuleChanged = useMemo(() => {
    if (!isEdit || !categoryToEdit) return false;
    const rawEnvelopeType =
      categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
    const initialBillMode = rawEnvelopeType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL";
    const parsedInitialRecurrence = parseRecurrenceRule(categoryToEdit.rrule, categoryToEdit.budgetFrequency);
    const initialFreq = parsedInitialRecurrence.frequency;
    const initialInterval = parsedInitialRecurrence.interval;
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? formatIsoDate(rawStartDate) : "";
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? formatIsoDate(rawDate) : "";
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

    const canonicalEnvelopeType: "EVERYDAY" | "BILL" | "GOAL" =
      type === "EVERYDAY" ? "EVERYDAY" : type === "GOAL" ? "GOAL" : "BILL";

    const fundingMode: "TARGET_BALANCE" | "RECURRING" | undefined =
      type === "EVERYDAY"
        ? undefined
        : type === "GOAL"
        ? goalMode === "ONGOING"
          ? "RECURRING"
          : "TARGET_BALANCE"
        : billMode === "FLEXIBLE_BILL"
        ? "TARGET_BALANCE"
        : "RECURRING";

    return {
      name: name.trim(),
      envelopeType: canonicalEnvelopeType,
      fundingMode,
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
      isPriority: type !== "EVERYDAY" ? isPriority : false,
      isEssential: type === "REGULAR" ? isPriority : undefined,
      isCommitted: type === "GOAL" ? isPriority : undefined,
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
    goalMode,
    setGoalMode,
    billMode,
    setBillMode,
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
    isEssential,
    setIsEssential,
    isCommitted,
    setIsCommitted,
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
