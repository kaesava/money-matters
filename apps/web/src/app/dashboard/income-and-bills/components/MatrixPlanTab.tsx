"use client";

import React, { useState, useMemo } from "react";
import { computeMatrixProjection, MatrixIncomeEvent, ScheduledExpenseEvent } from "@money-matters/capability-budgeting/engine";
import { EngineBucket } from "@money-matters/capability-budgeting/engine";
import { SlideOverCategoryDrawer, CategoryScheduledEvent } from "./SlideOverCategoryDrawer";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useToast, InfoTooltip, ConfirmDialog, Button } from "@money-matters/ui/web";
import { PaydayActionDrawer } from "../../../../components/web/PaydayActionDrawer";

interface MatrixPlanTabProps {
  currentUserId: string;
  categories: EngineBucket[];
  incomeEvents: MatrixIncomeEvent[];
  expenseEvents: ScheduledExpenseEvent[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
}

interface MatrixCellInputProps {
  value: number;
  isReadOnly?: boolean;
  isSurplusTarget?: boolean;
  hasWarning?: boolean;
  isOverride?: boolean;
  onCommit: (valStr: string) => void;
}

function MatrixCellInput({
  value,
  isReadOnly,
  isSurplusTarget,
  hasWarning,
  isOverride,
  onCommit,
}: MatrixCellInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [valStr, setValStr] = React.useState(`$${value.toFixed(2)}`);

  React.useEffect(() => {
    if (!isFocused) {
      setValStr(`$${value.toFixed(2)}`);
    }
  }, [value, isFocused]);

  const isDeficit = Boolean(isSurplusTarget && value < 0);

  if (isSurplusTarget) {
    return (
      <div className="flex flex-col items-center">
        <span
          className={`px-2.5 py-1 font-mono font-bold text-xs rounded-lg border ${
            isDeficit
              ? "bg-red-100 text-red-800 border-red-500 font-black animate-pulse shadow-xs"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
          title={isDeficit ? "DEFICIT: Allocations exceed income!" : "Surplus Target"}
        >
          {isDeficit ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`}
        </span>
      </div>
    );
  }

  return (
    <input
      type="text"
      value={valStr}
      disabled={isReadOnly}
      onClick={(e) => e.stopPropagation()}
      onFocus={() => {
        setIsFocused(true);
        setValStr(value === 0 ? "" : value.toString());
      }}
      onChange={(e) => setValStr(e.target.value)}
      onBlur={() => {
        setIsFocused(false);
        onCommit(valStr);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={`w-20 text-center font-mono font-bold text-xs py-1 rounded-md border ${
        hasWarning
          ? "border-red-500 text-red-700 bg-red-100/50"
          : isOverride
          ? "border-blue-400 text-blue-700 bg-blue-50"
          : "border-transparent hover:border-zinc-300 bg-transparent text-[#1B2B4B] dark:text-white"
      }`}
    />
  );
}

export function MatrixPlanTab({
  currentUserId,
  categories,
  incomeEvents,
  expenseEvents,
  onMarkPaid,
}: MatrixPlanTabProps) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();

  const SESSION_DRAFT_KEY = "matrix_plan_draft_overrides";
  const [isSaving, setIsSaving] = useState(false);
  const [showFullHorizon, setShowFullHorizon] = useState(false);
  const [cellOverrides, setCellOverrides] = useState<Record<string, number>>({});
  const [initialOverrides, setInitialOverrides] = useState<Record<string, number>>({});
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [activeCategoryForDrawer, setActiveCategoryForDrawer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activePaydayEventId, setActivePaydayEventId] = useState<string | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

  // Load saved allocation plans into initial overrides state
  React.useEffect(() => {
    if (allPlansQuery.data) {
      const savedMap: Record<string, number> = {};
      for (const plan of allPlansQuery.data) {
        if (plan.expectedDate && plan.lines) {
          for (const line of plan.lines) {
            const amount = parseFloat(line.confirmedAmount || line.proposedAmount || "0");
            savedMap[`${plan.incomeEventId}_${line.categoryId}`] = amount;
          }
        }
      }
      setInitialOverrides(savedMap);

      if (typeof window !== "undefined") {
        const storedDraft = sessionStorage.getItem(SESSION_DRAFT_KEY);
        if (storedDraft) {
          try {
            const parsedDraft = JSON.parse(storedDraft);
            if (Object.keys(parsedDraft).length > 0) {
              setCellOverrides(parsedDraft);
              setIsDraftRestored(true);
              return;
            }
          } catch (_e) {
            // Ignore parse errors
          }
        }
      }

      setCellOverrides(savedMap);
    }
  }, [allPlansQuery.data]);

  const isDirty = React.useMemo(() => {
    return JSON.stringify(cellOverrides) !== JSON.stringify(initialOverrides);
  }, [cellOverrides, initialOverrides]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (isDirty) {
        sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(cellOverrides));
      } else {
        sessionStorage.removeItem(SESSION_DRAFT_KEY);
        setIsDraftRestored(false);
      }
    }
  }, [cellOverrides, isDirty]);

  // Compute multi-payday projection using our engine
  const projection = useMemo(() => {
    return computeMatrixProjection({
      currentUserId,
      categories,
      incomeEvents,
      expenseEvents,
      cellOverrides,
      monthsAhead: 12,
    });
  }, [currentUserId, categories, incomeEvents, expenseEvents, cellOverrides]);

  // Default view: Next 5 paydays (or full horizon if expanded)
  const visibleColumns = useMemo(() => {
    if (showFullHorizon) return projection.columns;
    return projection.columns.slice(0, 5);
  }, [projection.columns, showFullHorizon]);

  // State for accordion group collapses
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const surplusCategory = categories.find((c) => c.isSurplusTarget);

  const handleCellEdit = (colId: string, categoryId: string, valueStr: string) => {
    const key = `${colId}_${categoryId}`;
    const cleaned = valueStr.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);

    if (isNaN(val)) {
      setCellOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    setCellOverrides((prev) => {
      const next = { ...prev, [key]: val };

      // Auto-sweep difference into designated Surplus Target category cell
      if (surplusCategory && categoryId !== surplusCategory.id) {
        const col = projection.columns.find((c) => c.id === colId);
        if (col) {
          let totalAllocated = 0;
          for (const cat of categories) {
            if (cat.id === surplusCategory.id) continue;
            const catKey = `${colId}_${cat.id}`;
            const catVal = typeof next[catKey] === "number" ? next[catKey] : 0;
            totalAllocated += catVal;
          }
          const surplusVal = Math.max(0, col.totalIncome - totalAllocated);
          next[`${colId}_${surplusCategory.id}`] = surplusVal;
        }
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      // Group cell overrides by incomeEventId (colId)
      const eventMap: Record<string, Array<{ poolId: string; proposedAmount: string }>> = {};
      for (const [key, val] of Object.entries(cellOverrides)) {
        const parts = key.split("_");
        const eventId = parts[0];
        const pId = parts.slice(1).join("_");
        if (!eventMap[eventId]) eventMap[eventId] = [];
        eventMap[eventId].push({ poolId: pId, proposedAmount: val.toFixed(2) });
      }

      for (const col of projection.columns) {
        const lines = eventMap[col.id] || [];
        if (lines.length > 0) {
          await saveBulkAllocationsMut.mutateAsync({
            incomeEventId: col.id,
            totalIncomeAmount: col.totalIncome.toFixed(2),
            lines,
          });
        }
      }

      await utils.listAllAllocationPlans.invalidate();
      setInitialOverrides(cellOverrides);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_DRAFT_KEY);
      }
      setIsDraftRestored(false);
      toast.success(t("toasts.saved"));
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save allocations");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setCellOverrides(initialOverrides);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_DRAFT_KEY);
    }
    setIsDraftRestored(false);
    toast.info("Unsaved allocation edits discarded.");
  };

  // Filter events for the category drawer (supports pool-level and category-level)
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
          name: categories.find((c) => c.id === e.categoryId)?.name || "Bill Event",
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

  const revertPlanMut = trpc.revertAllocationPlan.useMutation();

  const [colToRevert, setColToRevert] = useState<string | null>(null);

  const handleRevertColumn = (colId: string) => {
    setColToRevert(colId);
  };

  const confirmRevertColumn = async () => {
    if (!colToRevert) return;
    try {
      await revertPlanMut.mutateAsync({ incomeEventId: colToRevert });
      await utils.listAllAllocationPlans.invalidate();
      setCellOverrides((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${colToRevert}_`)) {
            delete next[k];
          }
        }
        return next;
      });
      toast.success("Reverted to automatic waterfall allocations.");
    } catch (_err: unknown) {
      toast.error("Failed to revert payday.");
    }
 finally {
      setColToRevert(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls & Expansion Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
            <span>Income Allocation Grid</span>
            <InfoTooltip content="Allocate upcoming Income into Pools to stay in control of your targets out to 12 months" />
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowFullHorizon(!showFullHorizon)}
          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#1B2B4B] dark:text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
        >
          {showFullHorizon
            ? "Show Next 5 Paydays"
            : `Show Full 12 Months (${projection.columns.length} Paydays)`}
        </button>
      </div>

      {/* Matrix Table */}
      <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {/* Column Headers (Paydays) */}
            <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
              <th className="sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-800/90 p-4 font-bold text-[#1B2B4B] dark:text-zinc-200 min-w-[260px] border-r border-zinc-200 dark:border-zinc-700">
                Pools & Goal Categories
              </th>
              {visibleColumns.map((col) => {
                const hasPlanOverride = Object.keys(cellOverrides).some((k) => k.startsWith(`${col.id}_`));
                const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
                const incomeEvt = incomeEvents.find((e) => e.id === col.id);
                const isPast = incomeEvt ? incomeEvt.expectedDate < todayStr : false;

                return (
                  <th
                    key={col.id}
                    className="p-3 font-bold text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[150px]"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <span className="text-sm font-black text-[#1B2B4B] dark:text-white font-mono">
                          {col.dateLabel}
                        </span>
                        {isPast && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                            Overdue
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        {col.sourceName}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setActivePaydayEventId(col.id)}
                        className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-1 py-0.5"
                      >
                        {t("common.runSplit", { defaultValue: "Income Split" })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncomeToDelete(col.id)}
                        className="text-xs font-semibold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors px-1 py-0.5"
                      >
                        Delete
                      </button>
                      {hasPlanOverride && (
                        <button
                          type="button"
                          onClick={() => handleRevertColumn(col.id)}
                          className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-1 rounded border border-blue-200"
                          title="Revert to Automatic Income Split"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
                      +${col.totalIncome.toFixed(2)}
                    </div>
                    {col.hiddenAllocationsTotal > 0 && (
                      <div className="text-[9px] font-medium text-zinc-400 mt-0.5">
                        (${col.hiddenAllocationsTotal.toFixed(2)} private)
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {projection.groups.map((group) => {
              const isSurplusSection = group.id === "surplus";
              const isCollapsed = isSurplusSection ? false : collapsedGroups[group.id];
              return (
                <React.Fragment key={group.id}>
                  {/* Accordion Group Header */}
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-bold text-[#1B2B4B] dark:text-white">
                    <td
                      colSpan={visibleColumns.length + 1}
                      onClick={() => !isSurplusSection && toggleGroup(group.id)}
                      className={`p-3 ${isSurplusSection ? "" : "cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800"} transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        {!isSurplusSection && <span>{isCollapsed ? "▶" : "▼"}</span>}
                        <span>{group.title}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Accordion Category Rows */}
                  {!isCollapsed &&
                    group.rows.map((row) => (
                      <tr
                        key={row.categoryId}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/40 transition-colors"
                      >
                        {/* Sticky Category Name */}
                        <td
                          onClick={() => setActiveCategoryForDrawer({ id: row.categoryId, name: row.categoryName })}
                          className="sticky left-0 z-10 bg-white dark:bg-zinc-900 p-3 font-semibold text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:text-[#2563eb]"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5">
                              {row.categoryName}
                              {row.isSurplusTarget && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Surplus Sweep Target: Sweeps leftover cash on payday">
                                  Sweep Target
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Payday Allocation Cells */}
                        {visibleColumns.map((col) => {
                          const cell = row.cells[col.id] || {
                            allocated: 0,
                            projectedBalance: 0,
                            minProjectedBalance: 0,
                            isOverride: false,
                            hasWarning: false,
                          };

                          return (
                            <td
                              key={col.id}
                              onClick={() => setActiveCategoryForDrawer({ id: row.categoryId, name: row.categoryName })}
                              className={`p-2 border-r border-zinc-200 dark:border-zinc-800 text-center transition-colors cursor-pointer ${
                                cell.hasWarning
                                  ? "bg-red-50/80 dark:bg-red-950/40 border-red-300"
                                  : cell.isOverride
                                  ? "bg-blue-50/50 dark:bg-blue-950/30"
                                  : ""
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                <MatrixCellInput
                                  value={cell.allocated}
                                  isSurplusTarget={row.isSurplusTarget}
                                  hasWarning={cell.hasWarning}
                                  isOverride={cell.isOverride}
                                  onCommit={(valStr) => handleCellEdit(col.id, row.categoryId, valStr)}
                                />
                                <span className="text-[9px] font-mono text-zinc-400 mt-0.5">
                                  Bal: ${cell.projectedBalance.toFixed(2)}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contextual Category Slide-Over Drawer */}
      <SlideOverCategoryDrawer
        isOpen={!!activeCategoryForDrawer}
        onClose={() => setActiveCategoryForDrawer(null)}
        categoryName={activeCategoryForDrawer?.name || ""}
        events={drawerEvents}
        onMarkPaid={onMarkPaid}
      />

      {/* Floating Save & Discard Action Bar */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-zinc-900 text-white p-3.5 px-6 rounded-2xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
            {isDraftRestored && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[10px] font-bold">
                Draft Restored
              </span>
            )}
            You have unsaved allocation edits.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Discard
            </button>
            <Button
              type="button"
              onClick={handleSaveChanges}
              loading={isSaving}
              className="px-4 py-1.5 text-xs shadow-md"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Payday Wizard / Execution Modal */}
      <PaydayActionDrawer
        isOpen={!!activePaydayEventId}
        onClose={() => setActivePaydayEventId(null)}
        incomeEventId={activePaydayEventId || undefined}
        onSuccess={() => {
          utils.listAllAllocationPlans.invalidate();
          utils.listIncomeEvents.invalidate();
        }}
      />

      <ConfirmDialog
        isOpen={!!colToRevert}
        onClose={() => setColToRevert(null)}
        onConfirm={confirmRevertColumn}
        title="Revert Payday Allocations"
        description="This will delete your custom overrides and revert this payday to automatic calculations. Continue?"
        confirmLabel="Revert Payday"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={async () => {
          if (incomeToDelete) {
            try {
              await deleteIncomeMut.mutateAsync({ eventId: incomeToDelete });
              toast.success("Income deleted.");
              await utils.listIncomeEvents.invalidate();
              await utils.listAllAllocationPlans.invalidate();
            } catch (_err) {
              toast.error("Failed to delete income.");
            } finally {
              setIncomeToDelete(null);
            }
          }
        }}
        title="Delete Income"
        description="Are you sure you want to Delete this Income?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}


export { MatrixPlanTab as BulkAllocateTab };
