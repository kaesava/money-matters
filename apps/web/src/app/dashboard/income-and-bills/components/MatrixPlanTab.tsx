"use client";

import React, { useState, useMemo } from "react";
import { computeMatrixProjection, MatrixIncomeEvent, ScheduledExpenseEvent, EngineBucket } from "@money-matters/capability-budgeting/engine";
import { SlideOverCategoryDrawer, CategoryScheduledEvent } from "./SlideOverCategoryDrawer";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useToast, InfoTooltip, ConfirmDialog } from "@money-matters/ui/web";
import { PaydayActionDrawer } from "../../../../components/web/PaydayActionDrawer";

interface MatrixPlanTabProps {
  currentUserId: string;
  categories: EngineBucket[];
  incomeEvents: MatrixIncomeEvent[];
  expenseEvents: ScheduledExpenseEvent[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
}

function formatDateShort(dateStr?: string, fallbackLabel?: string): string {
  if (!dateStr) return fallbackLabel || "";
  const dateObj = new Date(dateStr + "T00:00:00");
  if (isNaN(dateObj.getTime())) return fallbackLabel || dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(dateObj);
}

function MatrixCellInput({
  value,
  isSurplusTarget,
}: {
  value: number;
  isSurplusTarget?: boolean;
}) {
  const isDeficit = Boolean(isSurplusTarget && value < 0);

  if (isSurplusTarget) {
    return (
      <div className="flex flex-col items-center">
        <span
          className={`px-2 py-0.5 font-mono font-bold text-xs rounded-md border ${
            isDeficit
              ? "bg-red-100 text-red-800 border-red-500 font-black animate-pulse"
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
    <div className="w-20 text-center font-mono font-bold text-xs py-0.5 text-[#1B2B4B] dark:text-white">
      ${value.toFixed(2)}
    </div>
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
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();
  const saveAutoAllocationMut = trpc.saveAutoAllocation.useMutation();
  const revertPlanMut = trpc.revertAllocationPlan.useMutation();

  const [showFullHorizon, setShowFullHorizon] = useState(false);
  const [activeCategoryForDrawer, setActiveCategoryForDrawer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activePaydayEventId, setActivePaydayEventId] = useState<string | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  const [savingColId, setSavingColId] = useState<string | null>(null);
  const [colToUnsave, setColToUnsave] = useState<string | null>(null);

  // Confirmed income events must NOT be shown in this planning view
  const upcomingIncomeEvents = useMemo(() => {
    return incomeEvents.filter((e) => e.status !== "CONFIRMED");
  }, [incomeEvents]);

  // Derive read-only cell values from saved/confirmed plan data.
  const savedPlanOverrides = React.useMemo(() => {
    const overrideMap: Record<string, number> = {};
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        if (plan.lines) {
          for (const line of plan.lines) {
            const typedLine = line as unknown as { confirmedAmount?: string; proposedAmount?: string; poolId: string };
            const amount = parseFloat(typedLine.confirmedAmount || typedLine.proposedAmount || "0");
            overrideMap[`${plan.incomeEventId}_${typedLine.poolId}`] = amount;
          }
        }
      }
    }
    return overrideMap;
  }, [allPlansQuery.data]);

  // Per-income-event state: AUTO = no plan, SAVED = PENDING plan.
  const columnStateMap = React.useMemo(() => {
    const stateMap: Record<string, "AUTO" | "SAVED"> = {};
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        if (plan.status !== "CONFIRMED") {
          stateMap[plan.incomeEventId] = "SAVED";
        }
      }
    }
    return stateMap;
  }, [allPlansQuery.data]);

  // Compute multi-payday projection using engine
  const projection = useMemo(() => {
    return computeMatrixProjection({
      currentUserId,
      categories,
      incomeEvents: upcomingIncomeEvents,
      expenseEvents,
      cellOverrides: savedPlanOverrides,
      monthsAhead: 12,
    });
  }, [currentUserId, categories, upcomingIncomeEvents, expenseEvents, savedPlanOverrides]);

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

  // Filter events for the category drawer
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

  const handleSaveAutoSplit = async (colId: string) => {
    try {
      setSavingColId(colId);
      const col = projection.columns.find((c) => c.id === colId);
      await saveAutoAllocationMut.mutateAsync({
        incomeEventId: colId,
        totalIncomeAmount: col ? col.totalIncome.toFixed(2) : "0.00",
      });
      await utils.listAllAllocationPlans.invalidate();
      toast.success(t("matrix.saveSplitSuccess", { defaultValue: "Income Split saved successfully." }));
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save Income Split.");
    } finally {
      setSavingColId(null);
    }
  };

  const confirmUnsaveColumn = async () => {
    if (!colToUnsave) return;
    try {
      await revertPlanMut.mutateAsync({ incomeEventId: colToUnsave });
      await utils.listAllAllocationPlans.invalidate();
      toast.success(t("matrix.revertSuccess", { defaultValue: "Reverted. Income Split will be auto-calculated." }));
    } catch (_err: unknown) {
      toast.error("Failed to unsave payday.");
    } finally {
      setColToUnsave(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls & Expansion Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
            <span>{t("matrix.incomeAllocationGridTitle", { defaultValue: "Income Split Planning Grid" })}</span>
            <InfoTooltip content={t("matrix.incomeAllocationGridTooltip", { defaultValue: "Plan upcoming Income Splits across Pools out to 12 months. Click 'Review' to edit or save." })} />
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowFullHorizon(!showFullHorizon)}
          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#1B2B4B] dark:text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          {showFullHorizon
            ? t("matrix.showNext5", { defaultValue: "Show Next 5 Paydays" })
            : t("matrix.showFull12Events", { defaultValue: `Show Full 12 Months (${projection.columns.length} Income Events)` }).replace("{count}", String(projection.columns.length))}
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
                const incomeEvt = upcomingIncomeEvents.find((e) => e.id === col.id);
                const colState = columnStateMap[col.id] ?? "AUTO";
                const isSaved = colState === "SAVED";

                const dateStr = formatDateShort(incomeEvt?.expectedDate, col.dateLabel);

                return (
                  <th
                    key={col.id}
                    className={`p-3 text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[170px] transition-colors ${
                      isSaved ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      {/* Row 1: Source Name (font a little bigger, center aligned) */}
                      <div className="text-sm font-bold text-[#1B2B4B] dark:text-white truncate max-w-[160px]">
                        {col.sourceName}
                      </div>

                      {/* Row 2: Date (center aligned) */}
                      <div className="text-xs text-zinc-500 font-medium">
                        {dateStr}
                      </div>

                      {/* Row 3: Amount in slightly bigger font (center aligned) */}
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        +${col.totalIncome.toFixed(2)}
                      </div>

                      {/* Row 4: Action Links (Review | Save / Unsave | Delete separated by subtle '|') */}
                      <div className="flex items-center justify-center gap-1.5 text-xs mt-1.5 flex-wrap font-medium">
                        <button
                          type="button"
                          onClick={() => setActivePaydayEventId(col.id)}
                          className="font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors"
                        >
                          {t("matrix.review", { defaultValue: "Review" })}
                        </button>

                        <span className="text-zinc-300 dark:text-zinc-700 select-none">|</span>

                        {!isSaved ? (
                          <button
                            type="button"
                            disabled={savingColId === col.id}
                            onClick={() => handleSaveAutoSplit(col.id)}
                            className="font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:underline cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {savingColId === col.id ? "…" : t("matrix.save", { defaultValue: "Save" })}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setColToUnsave(col.id)}
                            className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer transition-colors"
                          >
                            {t("matrix.unsave", { defaultValue: "Unsave" })}
                          </button>
                        )}

                        <span className="text-zinc-300 dark:text-zinc-700 select-none">|</span>

                        <button
                          type="button"
                          onClick={() => setIncomeToDelete(col.id)}
                          className="font-semibold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      {col.hiddenAllocationsTotal > 0 && (
                        <div className="text-[9px] font-medium text-zinc-400 mt-1">
                          (${col.hiddenAllocationsTotal.toFixed(2)} private)
                        </div>
                      )}
                    </div>
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
                        className="border-b border-zinc-100 dark:border-zinc-800/60 transition-colors"
                      >
                        {/* Sticky Category Name — ONLY the pool/category name is a hyperlink */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 p-3 border-r border-zinc-200 dark:border-zinc-800">
                          <span
                            onClick={() => setActiveCategoryForDrawer({ id: row.categoryId, name: row.categoryName })}
                            className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors"
                          >
                            {row.categoryName}
                          </span>
                        </td>

                        {/* Payday Allocation Cells (no full-row hyperlink, clean un-cluttered cells) */}
                        {visibleColumns.map((col) => {
                          const cell = row.cells[col.id] || {
                            allocated: 0,
                            projectedBalance: 0,
                            minProjectedBalance: 0,
                            isOverride: false,
                            hasWarning: false,
                          };

                          const isSavedCol = (columnStateMap[col.id] ?? "AUTO") === "SAVED";

                          return (
                            <td
                              key={col.id}
                              className={`p-2 border-r border-zinc-200 dark:border-zinc-800 text-center transition-colors ${
                                isSavedCol ? "bg-blue-50/20 dark:bg-blue-950/10" : ""
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                <MatrixCellInput
                                  value={cell.allocated}
                                  isSurplusTarget={row.isSurplusTarget}
                                />
                                <span className="text-[10px] font-mono text-zinc-500 font-medium mt-0.5">
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
        categoryId={activeCategoryForDrawer?.id}
        events={drawerEvents}
        onMarkPaid={onMarkPaid}
      />

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

      {/* Unsave Warning Dialog */}
      <ConfirmDialog
        isOpen={!!colToUnsave}
        onClose={() => setColToUnsave(null)}
        onConfirm={confirmUnsaveColumn}
        title={t("matrix.unsaveDialogTitle", { defaultValue: "Unsave Income Split" })}
        description={t("matrix.unsaveDialogDescription", { defaultValue: "Your saved Income Split will be lost and will be auto-calculated. Continue?" })}
        confirmLabel={t("matrix.unsaveDialogConfirm", { defaultValue: "Unsave" })}
        variant="warning"
      />

      {/* Delete Income Confirmation Dialog */}
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
