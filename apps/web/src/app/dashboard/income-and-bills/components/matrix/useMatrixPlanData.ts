"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../../lib/trpc";
import { useToast } from "@money-matters/ui/web";
import type { CategoryScheduledEvent } from "../EnvelopeDetailDrawer";

export interface CategoryData {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  monthlyAmount?: number | null;
  targetAmount?: number | null;
  isCommitted?: boolean;
  isSurplusTarget?: boolean;
  isPrivate?: boolean;
}

export interface IncomeEventData {
  id: string;
  expectedDate: string;
  expectedAmount: number;
  actualAmount?: number | null;
  status: "PENDING" | "CONFIRMED";
  sourceName: string;
  isPrivate?: boolean;
}

export interface ExpenseEventData {
  categoryId: string;
  amount: number;
  dueDate: string;
  status?: "PENDING" | "CONFIRMED";
}

interface UseMatrixPlanDataParams {
  propsCategories?: CategoryData[];
  propsIncomeEvents?: IncomeEventData[];
  propsExpenseEvents?: ExpenseEventData[];
}

export function useMatrixPlanData({
  propsCategories = [],
  propsIncomeEvents = [],
  propsExpenseEvents = [],
}: UseMatrixPlanDataParams) {
  const pathname = usePathname();
  const toast = useToast();
  const utils = trpc.useUtils();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();
  const saveAutoAllocationMut = trpc.saveAutoAllocation.useMutation();
  const resetAllocationPlanMut = trpc.resetAllocationPlan.useMutation();
  const matrixQuery = trpc.getMatrixProjectionData.useQuery({ monthsAhead: 12 });

  const categories = useMemo(() => {
    if (propsCategories.length > 0) return propsCategories;
    if (!matrixQuery.data?.pools) return [];
    return matrixQuery.data.pools.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.envelopeType,
      currentBalance: 0,
      monthlyAmount: p.monthlyAmount ? parseFloat(p.monthlyAmount) : null,
      targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
      isCommitted: Boolean(p.isCommitted),
      isSurplusTarget: Boolean(p.isSurplusTarget),
      isPrivate: Boolean(p.isPrivate),
    }));
  }, [propsCategories, matrixQuery.data?.pools]);

  const incomeEvents = useMemo(() => {
    if (propsIncomeEvents.length > 0) return propsIncomeEvents;
    return (
      matrixQuery.data?.rawIncomeEvents?.map((e) => ({
        id: e.id,
        expectedDate: e.expectedDate,
        expectedAmount: parseFloat(e.expectedAmount),
        actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
        status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
        sourceName: e.sourceName,
        isPrivate: false,
      })) || []
    );
  }, [propsIncomeEvents, matrixQuery.data?.rawIncomeEvents]);

  const expenseEvents = useMemo(() => {
    if (propsExpenseEvents.length > 0) return propsExpenseEvents;
    return (
      matrixQuery.data?.rawExpenseEvents?.map((e) => ({
        categoryId: e.envelopeId || "",
        amount: parseFloat(e.actualAmount || e.expectedAmount || "0"),
        dueDate: e.expectedDate,
        status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
      })) || []
    );
  }, [propsExpenseEvents, matrixQuery.data?.rawExpenseEvents]);

  const returnTo = useMemo(() => {
    return pathname?.startsWith("/dashboard/income-split")
      ? "/dashboard/income-split"
      : "/dashboard/income-and-bills";
  }, [pathname]);

  const [showFullHorizon, setShowFullHorizon] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [activeCategoryForDrawer, setActiveCategoryForDrawer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  const [savingColId, setSavingColId] = useState<string | null>(null);
  const [colToSave, setColToSave] = useState<string | null>(null);
  const [colToReset, setColToReset] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CONFIRMED">("PENDING");

  const columnStateMap = useMemo(() => {
    const stateMap: Record<string, "AUTO" | "SAVED" | "CONFIRMED"> = {};
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        if (plan.status === "CONFIRMED") {
          stateMap[plan.incomeEventId] = "CONFIRMED";
        } else {
          stateMap[plan.incomeEventId] = "SAVED";
        }
      }
    }
    return stateMap;
  }, [allPlansQuery.data]);

  const serverProjection = matrixQuery.data?.projection;

  const projection = useMemo(() => {
    if (!serverProjection) {
      return { columns: [], groups: [] };
    }
    const filteredCols = serverProjection.columns.filter((c) => {
      const colState = columnStateMap[c.id] ?? "AUTO";
      const isConfirmed = colState === "CONFIRMED";
      if (statusFilter === "PENDING" && isConfirmed) return false;
      if (statusFilter === "CONFIRMED" && !isConfirmed) return false;
      return true;
    });

    const filteredGrps = serverProjection.groups.map((grp) => ({
      ...grp,
      rows: grp.rows.filter((row) => {
        if (scopeFilter === "PRIVATE") return row.isPrivate;
        if (scopeFilter === "SHARED") return !row.isPrivate;
        return true;
      }),
    }));

    return {
      columns: filteredCols,
      groups: filteredGrps,
    };
  }, [serverProjection, columnStateMap, statusFilter, scopeFilter]);

  const visibleColumns = useMemo(() => {
    if (showFullHorizon) return projection.columns;
    return projection.columns.slice(0, 5);
  }, [projection.columns, showFullHorizon]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const drawerEvents: CategoryScheduledEvent[] = useMemo(() => {
    if (!activeCategoryForDrawer) return [];

    if (activeCategoryForDrawer.id === "pool_everyday") {
      const everydayIds = new Set(categories.filter((c) => c.type === "EVERYDAY").map((c) => c.id));
      return expenseEvents
        .filter((e) => everydayIds.has(e.categoryId))
        .map((e, idx) => ({
          id: `exp_ev_${idx}_${e.dueDate}`,
          name: categories.find((c) => c.id === e.categoryId)?.name || "Everyday Expense",
          amount: e.amount.toFixed(2),
          dueDate: e.dueDate,
        }));
    }

    if (activeCategoryForDrawer.id === "pool_bills") {
      const billsIds = new Set(categories.filter((c) => c.type === "REGULAR").map((c) => c.id));
      return expenseEvents
        .filter((e) => billsIds.has(e.categoryId))
        .map((e, idx) => ({
          id: `exp_bills_${idx}_${e.dueDate}`,
          name: categories.find((c) => c.id === e.categoryId)?.name || "Bill Expense",
          amount: e.amount.toFixed(2),
          dueDate: e.dueDate,
        }));
    }

    return expenseEvents
      .filter((e) => e.categoryId === activeCategoryForDrawer.id)
      .map((e, idx) => ({
        id: `exp_${idx}_${e.dueDate}`,
        name: activeCategoryForDrawer.name,
        amount: e.amount.toFixed(2),
        dueDate: e.dueDate,
      }));
  }, [activeCategoryForDrawer, categories, expenseEvents]);

  const handleSaveAutoSplit = async (colId: string) => {
    try {
      setSavingColId(colId);
      const col = projection.columns.find((c) => c.id === colId);
      await saveAutoAllocationMut.mutateAsync({
        incomeEventId: colId,
        totalIncomeAmount: col ? col.totalIncome.toFixed(2) : "0.00",
      });
      await Promise.all([
        utils.listAllAllocationPlans.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
        utils.previewPayday.invalidate({ incomeEventId: colId }),
      ]);
      toast.success(t("matrix.saveSplitSuccess"));
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save Income Split.");
    } finally {
      setSavingColId(null);
    }
  };

  const handleResetPlan = async (colId: string) => {
    try {
      await resetAllocationPlanMut.mutateAsync({ incomeEventId: colId });
      await Promise.all([
        utils.listAllAllocationPlans.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
        utils.previewPayday.invalidate({ incomeEventId: colId }),
      ]);
      toast.success(t("paydayDrawer.recalculateSuccess"));
    } catch (err: unknown) {
      toast.error((err as Error).message || t("paydayDrawer.recalculateFailed"));
    } finally {
      setColToReset(null);
    }
  };

  const confirmDeleteIncome = async () => {
    if (!incomeToDelete) return;
    try {
      await deleteIncomeMut.mutateAsync({ eventId: incomeToDelete });
      toast.success(t("toasts.deleted"));
      await Promise.all([
        utils.listIncomeEvents.invalidate(),
        utils.listAllAllocationPlans.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
      ]);
    } catch (_err) {
      toast.error(t("common.errorTryAgain"));
    } finally {
      setIncomeToDelete(null);
    }
  };

  return {
    categories,
    incomeEvents,
    returnTo,
    showFullHorizon,
    setShowFullHorizon,
    scopeFilter,
    setScopeFilter,
    statusFilter,
    setStatusFilter,
    columnStateMap,
    projection,
    visibleColumns,
    collapsedGroups,
    toggleGroup,
    activeCategoryForDrawer,
    setActiveCategoryForDrawer,
    drawerEvents,
    savingColId,
    colToSave,
    setColToSave,
    colToReset,
    setColToReset,
    incomeToDelete,
    setIncomeToDelete,
    handleSaveAutoSplit,
    handleResetPlan,
    confirmDeleteIncome,
  };
}
