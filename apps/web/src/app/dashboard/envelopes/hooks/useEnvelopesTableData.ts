"use client";

import { useState, useMemo, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { computeEnvelopeStatus, type EnvelopeStatusResult } from "@money-matters/types";
import type { EnvelopeSummaryItem, PoolTableRow, EnvelopeType, FundingMode } from "../types";

export type PoolTypeFilter = "ALL" | "EVERYDAY" | "BILL" | "GOAL";

export const POOL_TYPE_ORDER: Record<string, number> = {
  EVERYDAY: 0,
  BILL: 1,
  GOAL: 2,
};

type SortField = "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate";

interface UseEnvelopesTableDataParams {
  rawPools?: Array<{
    id: string;
    name: string;
    envelopeType: string;
    fundingMode?: string | null;
    isPriority?: boolean | null;
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
    isSurplusTarget?: boolean | null;
    hasScheduledEvents?: boolean | null;
    generateEvents?: boolean | null;
  }>;
  rawExpenseEvents?: Array<{ id: string; name?: string | null; envelopeId?: string | null; expectedDate?: string | null; status: string }>;
  rawIncomeEvents?: Array<{ id: string; expectedDate?: string | null; status: string }>;
  rawTransactions?: Array<{ id: string; envelopeId?: string | null; note?: string | null }>;
  projectionColumns?: Array<{ id: string; date: string }>;
  poolBalances?: Record<string, Record<string, number>>;
  userTimezone: string;
  paramSearch?: string;
  paramType?: PoolTypeFilter;
  poolIdParam?: string;
}

function formatProgressText(status: EnvelopeStatusResult): string {
  switch (status.progressKind) {
    case "INACTIVE": return t("categories.statusInactive");
    case "COVERED": return t("categories.statusCovered");
    case "ON_TRACK": return t("categories.statusOnTrack");
    case "PARTIAL": return t("categories.statusPartial");
    case "SHORTFALL": return t("categories.statusShortfall");
    case "PERCENT": return status.progressPercentage !== null ? `${status.progressPercentage}%` : "100%";
    case "READY": return t("categories.readyToSpend");
    case "ATTENTION": return t("categories.needsAttention");
  }
}

function compareTableRows(a: PoolTableRow, b: PoolTableRow, sortField: SortField, sortDir: "asc" | "desc"): number {
  if (sortField === "poolType") {
    const orderA = POOL_TYPE_ORDER[a.poolType ?? a.envelopeType] ?? 99;
    const orderB = POOL_TYPE_ORDER[b.poolType ?? b.envelopeType] ?? 99;
    return sortDir === "asc" ? orderA - orderB : orderB - orderA;
  }
  const vals: Record<Exclude<SortField, "poolType">, [string | number | null, string | number | null]> = {
    name: [a.name.toLowerCase(), b.name.toLowerCase()],
    bankAccountName: [(a.bankAccountName || "").toLowerCase(), (b.bankAccountName || "").toLowerCase()],
    currentBalance: [a.currentBalance, b.currentBalance],
    targetAmount: [a.targetAmount ?? -1, b.targetAmount ?? -1],
    targetDate: [a.targetDate ?? "", b.targetDate ?? ""],
  };
  const [aVal, bVal] = vals[sortField];
  if (aVal === bVal) return 0;
  if (aVal === null || aVal === "") return 1;
  if (bVal === null || bVal === "") return -1;
  return sortDir === "asc" ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
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
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (paramSearch) setSearchQuery(paramSearch);
    if (paramType) setTypeFilter(paramType);
  }, [paramSearch, paramType]);

  const activeProjectionColId = useMemo(() => {
    if (projectionMonths <= 0.05 || projectionColumns.length === 0) return null;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(projectionMonths * 30.4375));
    const targetDateISO = new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone }).format(d);
    const sortedCols = [...projectionColumns].sort((a, b) => a.date.localeCompare(b.date));
    let matchingCol = sortedCols[0];
    for (const col of sortedCols) {
      if (col.date <= targetDateISO) matchingCol = col;
      else break;
    }
    return matchingCol?.id ?? null;
  }, [projectionMonths, projectionColumns, userTimezone]);

  const tableRows: PoolTableRow[] = useMemo(() => {
    const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone }).format(new Date());
    const nextPaydayDate =
      rawIncomeEvents
        .filter((e) => e.expectedDate && e.expectedDate >= todayISO && e.status !== "CONFIRMED")
        .map((e) => e.expectedDate!)
        .sort()[0] || null;

    return rawPools.map((p) => {
      const qName = p.name.toLowerCase();
      let currentBal = p.currentBalance || 0;
      if (showProjectionMatrix && projectionMonths > 0.05 && activeProjectionColId && poolBalances?.[p.id]) {
        currentBal = poolBalances[p.id][activeProjectionColId] ?? currentBal;
      }
      const nextDueDate =
        rawExpenseEvents
          .filter((e) => (e.envelopeId === p.id || e.name?.toLowerCase() === qName) && e.status !== "CONFIRMED" && e.expectedDate)
          .map((e) => e.expectedDate!)
          .filter((d) => d >= todayISO)
          .sort()[0] || null;

      const status = computeEnvelopeStatus({ ...p, currentBalance: currentBal }, todayISO, nextPaydayDate, nextDueDate);
      const rawSummaryItem: EnvelopeSummaryItem = {
        id: p.id,
        name: p.name,
        envelopeType: status.canonicalType,
        type: status.canonicalType,
        poolType: status.canonicalType,
        fundingMode: status.fundingMode as FundingMode,
        isPriority: p.isPriority ?? false,
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
        isSurplusTarget: p.isSurplusTarget,
        hasScheduledEvents: p.hasScheduledEvents,
        generateEvents: p.generateEvents ?? true,
      };

      return {
        id: p.id,
        name: p.name,
        envelopeType: status.canonicalType as EnvelopeType,
        poolType: status.canonicalType as EnvelopeType,
        fundingMode: status.fundingMode,
        isPriority: p.isPriority ?? false,
        bankAccountId: p.bankAccountId,
        bankAccountName: p.bankAccountName || null,
        isPrivate: p.isPrivate,
        currentBalance: currentBal,
        targetAmount: status.targetAmountNum,
        endDate: p.endDate || null,
        targetDate: p.endDate || null,
        categoryCount: 0,
        progressText: formatProgressText(status),
        progressPercentage: status.progressPercentage,
        balanceStatus: status.balanceStatus,
        rawPool: rawSummaryItem,
        hasHistory: rawTransactions.some((tx) => tx.envelopeId === p.id || (tx.note && tx.note.toLowerCase().includes(qName))),
        hasUpcomingExpenses: rawExpenseEvents.some((e) => e.status !== "CONFIRMED" && (e.envelopeId === p.id || (e.name && e.name.toLowerCase().includes(qName)))),
      };
    });
  }, [rawPools, rawExpenseEvents, rawIncomeEvents, rawTransactions, userTimezone, showProjectionMatrix, projectionMonths, activeProjectionColId, poolBalances]);

  const matchedPool = poolIdParam ? tableRows.find((r) => r.id === poolIdParam) : null;
  const isFilterParamInvalid = Boolean(poolIdParam && !matchedPool);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tableRows.filter((row) => {
      if (poolIdParam && matchedPool && row.id !== poolIdParam) return false;
      if (typeFilter !== "ALL" && row.poolType !== typeFilter) return false;
      if (privacyFilter === "SHARED" && row.isPrivate) return false;
      if (privacyFilter === "PRIVATE" && !row.isPrivate) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        (row.categories ?? []).some((c) => c.name.toLowerCase().includes(q)) ||
        Boolean(row.bankAccountName?.toLowerCase().includes(q))
      );
    });
  }, [tableRows, poolIdParam, matchedPool, typeFilter, privacyFilter, searchQuery]);

  const sortedRows = useMemo(
    () => [...filteredRows].sort((a, b) => compareTableRows(a, b, sortField, sortDir)),
    [filteredRows, sortField, sortDir]
  );

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRows = useMemo(() => sortedRows.slice((page - 1) * pageSize, page * pageSize), [sortedRows, page, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return {
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter,
    privacyFilter, setPrivacyFilter,
    projectionMonths, setProjectionMonths,
    showProjectionMatrix, setShowProjectionMatrix,
    page, setPage,
    pageSize, setPageSize,
    sortField, sortDir, toggleSort,
    tableRows, matchedPool, isFilterParamInvalid,
    totalItems, totalPages, paginatedRows,
  };
}
