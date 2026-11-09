"use client";

import { useState, useMemo, useEffect } from "react";
import { t } from "@money-matters/i18n";
import type { EnvelopeSummaryItem, PoolTableRow, EnvelopeType } from "../types";

export type PoolTypeFilter = "ALL" | "EVERYDAY" | "BILL" | "GOAL" | "REGULAR";

export const POOL_TYPE_ORDER: Record<string, number> = {
  EVERYDAY: 0,
  BILL: 1,
  REGULAR: 1,
  GOAL: 2,
};

interface UseEnvelopesTableDataParams {
  rawPools?: Array<{
    id: string;
    name: string;
    envelopeType: string;
    bankAccountId?: string | null;
    bankAccountName?: string | null;
    isPrivate?: boolean | null;
    currentBalance?: number | null;
    targetAmount?: string | null;
    enteredAmount?: string | null;
    monthlyAmount?: string | null;
    budgetFrequency?: string | null;
    startDate?: string | null;
    rrule?: string | null;
    endDate?: string | null;
    safetyBufferFloor?: string | null;
    goalMode?: string | null;
    isEssential?: boolean | null;
    isCommitted?: boolean | null;
    isSurplusTarget?: boolean | null;
    hasScheduledEvents?: boolean | null;
    generateEvents?: boolean | null;
  }>;
  rawExpenseEvents?: Array<{
    id: string;
    name?: string | null;
    envelopeId?: string | null;
    expectedDate?: string | null;
    status: string;
  }>;
  rawIncomeEvents?: Array<{
    id: string;
    expectedDate?: string | null;
    status: string;
  }>;
  rawTransactions?: Array<{
    id: string;
    envelopeId?: string | null;
    note?: string | null;
  }>;
  projectionColumns?: Array<{ id: string; date: string }>;
  poolBalances?: Record<string, Record<string, number>>;
  userTimezone: string;
  paramSearch?: string;
  paramType?: PoolTypeFilter;
  poolIdParam?: string;
}

export function useEnvelopesTableData({
  rawPools = [],
  rawExpenseEvents = [],
  rawIncomeEvents = [],
  rawTransactions = [],
  projectionColumns = [],
  poolBalances,
  userTimezone,
  paramSearch = "",
  paramType = "ALL",
  poolIdParam = "",
}: UseEnvelopesTableDataParams) {
  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>(paramType);
  const [privacyFilter, setPrivacyFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [projectionMonths, setProjectionMonths] = useState(0);
  const [showProjectionMatrix, setShowProjectionMatrix] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<
    "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (paramSearch) setSearchQuery(paramSearch);
    if (paramType) setTypeFilter(paramType);
  }, [paramSearch, paramType]);

  const targetDateISO = useMemo(() => {
    if (projectionMonths <= 0.05) return null;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(projectionMonths * 30.4375));
    return new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone }).format(d);
  }, [projectionMonths, userTimezone]);

  const activeProjectionColId = useMemo(() => {
    if (!targetDateISO || !projectionColumns || projectionColumns.length === 0) return null;
    const sortedCols = [...projectionColumns].sort((a, b) => a.date.localeCompare(b.date));
    let matchingCol = sortedCols[0];
    for (const col of sortedCols) {
      if (col.date <= targetDateISO) {
        matchingCol = col;
      } else {
        break;
      }
    }
    return matchingCol?.id ?? null;
  }, [targetDateISO, projectionColumns]);

  const tableRows: PoolTableRow[] = useMemo(() => {
    const checkHasHistory = (id: string, name: string) => {
      const qName = name.toLowerCase();
      return rawTransactions.some(
        (t) => t.envelopeId === id || (t.note && t.note.toLowerCase().includes(qName))
      );
    };

    const checkHasUpcoming = (id: string, name: string) => {
      const qName = name.toLowerCase();
      return rawExpenseEvents.some(
        (e) =>
          e.status !== "CONFIRMED" &&
          (e.envelopeId === id || (e.name && e.name.toLowerCase().includes(qName)))
      );
    };

    const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone }).format(new Date());

    const pendingPaydays = (rawIncomeEvents || [])
      .filter((e) => e.expectedDate && e.expectedDate >= todayISO && e.status !== "CONFIRMED")
      .map((e) => e.expectedDate!)
      .sort();
    const nextPaydayDate = pendingPaydays[0] || null;

    return rawPools.map((p) => {
      const isGoal = p.envelopeType === "TARGET_GOAL" || p.envelopeType === "ONGOING_GOAL" || p.envelopeType === "GOAL";
      const _isBill = p.envelopeType === "SCHEDULED_BILL" || p.envelopeType === "FLEXIBLE_BILL" || p.envelopeType === "BILL";
      const isEveryday = p.envelopeType === "EVERYDAY";

      const targetAmountNum =
        p.envelopeType === "SCHEDULED_BILL"
          ? (p.enteredAmount ? parseFloat(p.enteredAmount) : p.targetAmount ? parseFloat(p.targetAmount) : p.monthlyAmount ? parseFloat(p.monthlyAmount) : null)
          : p.envelopeType === "ONGOING_GOAL"
          ? (p.enteredAmount ? parseFloat(p.enteredAmount) : p.monthlyAmount ? parseFloat(p.monthlyAmount) : p.targetAmount ? parseFloat(p.targetAmount) : null)
          : p.envelopeType === "TARGET_GOAL"
          ? (p.targetAmount ? parseFloat(p.targetAmount) : null)
          : (p.targetAmount ? parseFloat(p.targetAmount) : p.monthlyAmount ? parseFloat(p.monthlyAmount) : p.enteredAmount ? parseFloat(p.enteredAmount) : null);

      let currentBal = p.currentBalance || 0;
      if (showProjectionMatrix && projectionMonths > 0.05 && activeProjectionColId && poolBalances?.[p.id]) {
        currentBal = poolBalances[p.id][activeProjectionColId] ?? currentBal;
      }

      let progressText = "—";
      let progressPercentage: number | null = null;
      let balanceStatus: "INACTIVE" | "COVERED" | "PARTIAL" | "SHORTFALL" | "ON_TRACK" | undefined = undefined;

      if (p.envelopeType === "SCHEDULED_BILL") {
        if (p.startDate && todayISO < p.startDate) {
          balanceStatus = "INACTIVE";
          progressText = t("categories.statusInactive");
        } else if (p.endDate && todayISO > p.endDate) {
          balanceStatus = "INACTIVE";
          progressText = t("categories.statusInactive");
        } else {
          const poolUpcomingExpenses = rawExpenseEvents
            .filter((e) => (e.envelopeId === p.id || e.name?.toLowerCase() === p.name.toLowerCase()) && e.status !== "CONFIRMED" && e.expectedDate)
            .map((e) => e.expectedDate!)
            .filter((d) => d >= todayISO)
            .sort();
          const nextDueDate = poolUpcomingExpenses[0] || null;
          const billTarget = targetAmountNum || 0;
          const isFutureBill = nextPaydayDate && nextDueDate && nextDueDate > nextPaydayDate;

          if (isFutureBill) {
            balanceStatus = currentBal >= billTarget ? "COVERED" : "ON_TRACK";
            progressText = currentBal >= billTarget ? t("categories.statusCovered") : t("categories.statusOnTrack");
          } else {
            if (billTarget <= 0 || currentBal >= billTarget) {
              balanceStatus = "COVERED";
              progressText = t("categories.statusCovered");
            } else if (currentBal > 0) {
              balanceStatus = "PARTIAL";
              progressText = t("categories.statusPartial");
            } else {
              balanceStatus = "SHORTFALL";
              progressText = t("categories.statusShortfall");
            }
          }
        }
      } else if (p.envelopeType === "FLEXIBLE_BILL") {
        const flexTarget = p.monthlyAmount ? parseFloat(p.monthlyAmount) : (targetAmountNum || 0);
        if (flexTarget <= 0 || currentBal >= flexTarget) {
          balanceStatus = "COVERED";
          progressText = t("categories.statusCovered");
        } else if (currentBal > 0) {
          balanceStatus = "PARTIAL";
          progressText = t("categories.statusPartial");
        } else {
          balanceStatus = "SHORTFALL";
          progressText = t("categories.statusShortfall");
        }
      } else if (p.envelopeType === "ONGOING_GOAL") {
        const goalMonthly = p.monthlyAmount ? parseFloat(p.monthlyAmount) : (targetAmountNum || 0);
        if (goalMonthly <= 0 || currentBal >= goalMonthly) {
          balanceStatus = "COVERED";
          progressText = t("categories.statusCovered");
        } else if (currentBal > 0) {
          balanceStatus = "PARTIAL";
          progressText = t("categories.statusPartial");
        } else {
          balanceStatus = "SHORTFALL";
          progressText = t("categories.statusShortfall");
        }
        progressPercentage = 100;
      } else if (p.envelopeType === "TARGET_GOAL") {
        const targetGoalAmt = targetAmountNum || 0;
        if (p.endDate && todayISO > p.endDate && currentBal < targetGoalAmt) {
          balanceStatus = "SHORTFALL";
        } else if (targetGoalAmt <= 0 || currentBal >= targetGoalAmt) {
          balanceStatus = "COVERED";
        } else if (currentBal > 0) {
          balanceStatus = "PARTIAL";
        } else {
          balanceStatus = "SHORTFALL";
        }
        if (targetGoalAmt > 0) {
          const pct = Math.min(100, Math.round((currentBal / targetGoalAmt) * 100));
          progressPercentage = pct;
          progressText = `${pct}%`;
        } else {
          progressText = "100%";
        }
      } else if (isEveryday) {
        if (currentBal >= 0) {
          progressText = t("categories.readyToSpend");
        } else {
          progressText = t("categories.needsAttention");
        }
      }

      const rawSummaryItem: EnvelopeSummaryItem = {
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType as EnvelopeType,
        type: isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "BILL",
        poolType: isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "BILL",
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        currentBalance: String(currentBal),
        targetAmount: p.targetAmount,
        enteredAmount: p.enteredAmount,
        monthlyAmount: p.monthlyAmount,
        budgetFrequency: p.budgetFrequency,
        startDate: p.startDate,
        rrule: p.rrule,
        endDate: p.endDate,
        targetDate: p.endDate,
        safetyBufferFloor: p.safetyBufferFloor,
        goalMode: p.goalMode as "TARGET_DATE" | "ONGOING" | undefined,
        isEssential: p.isEssential ?? false,
        isCommitted: p.isCommitted ?? false,
        isSurplusTarget: p.isSurplusTarget,
        hasScheduledEvents: p.hasScheduledEvents,
        generateEvents: p.generateEvents ?? true,
      };

      return {
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType as EnvelopeType,
        poolType: isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "BILL",
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        isEssential: p.isEssential ?? false,
        isCommitted: p.isCommitted ?? false,
        currentBalance: currentBal,
        targetAmount: targetAmountNum,
        endDate: p.endDate || null,
        targetDate: p.endDate || null,
        categoryCount: 0,
        progressText,
        progressPercentage,
        balanceStatus,
        rawPool: rawSummaryItem,
        hasHistory: checkHasHistory(p.id, p.name),
        hasUpcomingExpenses: checkHasUpcoming(p.id, p.name),
      };
    });
  }, [
    rawPools,
    rawExpenseEvents,
    rawIncomeEvents,
    rawTransactions,
    userTimezone,
    showProjectionMatrix,
    projectionMonths,
    activeProjectionColId,
    poolBalances,
  ]);

  const matchedPool = poolIdParam ? tableRows.find((r) => r.id === poolIdParam) : null;
  const isFilterParamInvalid = Boolean(poolIdParam && !matchedPool);

  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      if (poolIdParam && matchedPool && row.id !== poolIdParam) {
        return false;
      }
      if (typeFilter !== "ALL") {
        const effectiveFilter = typeFilter === "REGULAR" ? "BILL" : typeFilter;
        if (row.poolType !== effectiveFilter) {
          return false;
        }
      }
      if (privacyFilter === "SHARED" && row.isPrivate) {
        return false;
      }
      if (privacyFilter === "PRIVATE" && !row.isPrivate) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const poolNameMatch = row.name.toLowerCase().includes(q);
      const catNameMatch = (row.categories ?? []).some((c) => c.name.toLowerCase().includes(q));
      const bankNameMatch = row.bankAccountName ? row.bankAccountName.toLowerCase().includes(q) : false;
      return poolNameMatch || catNameMatch || bankNameMatch;
    });
  }, [tableRows, poolIdParam, matchedPool, typeFilter, privacyFilter, searchQuery]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "bankAccountName") {
        aVal = (a.bankAccountName || "").toLowerCase();
        bVal = (b.bankAccountName || "").toLowerCase();
      } else if (sortField === "poolType") {
        const pTypeA = a.poolType ?? a.envelopeType;
        const pTypeB = b.poolType ?? b.envelopeType;
        const orderA = POOL_TYPE_ORDER[pTypeA] ?? 99;
        const orderB = POOL_TYPE_ORDER[pTypeB] ?? 99;
        return sortDir === "asc" ? orderA - orderB : orderB - orderA;
      } else if (sortField === "currentBalance") {
        aVal = a.currentBalance;
        bVal = b.currentBalance;
      } else if (sortField === "targetAmount") {
        aVal = a.targetAmount ?? -1;
        bVal = b.targetAmount ?? -1;
      } else if (sortField === "targetDate") {
        aVal = a.targetDate ?? "";
        bVal = b.targetDate ?? "";
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === "") return 1;
      if (bVal === null || bVal === "") return -1;

      if (sortDir === "asc") {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });
  }, [filteredRows, sortField, sortDir]);

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const toggleSort = (
    field: "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate"
  ) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    privacyFilter,
    setPrivacyFilter,
    projectionMonths,
    setProjectionMonths,
    showProjectionMatrix,
    setShowProjectionMatrix,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortField,
    sortDir,
    toggleSort,
    tableRows,
    matchedPool,
    isFilterParamInvalid,
    totalItems,
    totalPages,
    paginatedRows,
  };
}
