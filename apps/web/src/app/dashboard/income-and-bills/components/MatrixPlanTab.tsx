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

function MatrixCellInput({
  value,
  isSurplusTarget,
  hasWarning,
  isOverride,
}: {
  value: number;
  isSurplusTarget?: boolean;
  hasWarning?: boolean;
  isOverride?: boolean;
}) {
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
    <div
      className={`w-20 text-center font-mono font-bold text-xs py-1 rounded-md border ${
        hasWarning
          ? "border-red-500 text-red-700 bg-red-100/50"
          : isOverride
          ? "border-blue-400 text-blue-700 bg-blue-50"
          : "border-transparent text-[#1B2B4B] dark:text-white"
      }`}
    >
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
  const [colToRevert, setColToRevert] = useState<string | null>(null);

  // Derive read-only cell values from saved/confirmed plan data.
  // Keyed by `${incomeEventId}_${poolId}` to match matrix projection format.
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

  // Per-income-event state: AUTO = no plan, SAVED = PENDING plan, CONFIRMED = executed plan.
  const columnStateMap = React.useMemo(() => {
    const stateMap: Record<string, "AUTO" | "SAVED" | "CONFIRMED"> = {};
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        stateMap[plan.incomeEventId] = plan.status === "CONFIRMED" ? "CONFIRMED" : "SAVED";
      }
    }
    return stateMap;
  }, [allPlansQuery.data]);

  // Compute multi-payday projection using our engine
  const projection = useMemo(() => {
    return computeMatrixProjection({
      currentUserId,
      categories,
      incomeEvents,
      expenseEvents,
      cellOverrides: savedPlanOverrides,
      monthsAhead: 12,
    });
  }, [currentUserId, categories, incomeEvents, expenseEvents, savedPlanOverrides]);

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

  const confirmRevertColumn = async () => {
    if (!colToRevert) return;
    try {
      await revertPlanMut.mutateAsync({ incomeEventId: colToRevert });
      await utils.listAllAllocationPlans.invalidate();
      toast.success(t("matrix.revertSuccess", { defaultValue: "Reverted. Income Split will be auto-calculated." }));
    } catch (_err: unknown) {
      toast.error("Failed to revert payday.");
    } finally {
      setColToRevert(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls & Expansion Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
            <span>{t("matrix.incomeAllocationGridTitle", { defaultValue: "Income Split Planning Grid" })}</span>
            <InfoTooltip content={t("matrix.incomeAllocationGridTooltip", { defaultValue: "Plan upcoming Income Splits across Pools out to 12 months. Click 'Review Split' to edit or confirm." })} />
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowFullHorizon(!showFullHorizon)}
          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#1B2B4B] dark:text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          {showFullHorizon
            ? t("matrix.showNext5", { defaultValue: "Show Next 5 Paydays" })
            : t("matrix.showFull12", { defaultValue: `Show Full 12 Months (${projection.columns.length} Paydays)` }).replace("{count}", String(projection.columns.length))}
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
                const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
                const incomeEvt = incomeEvents.find((e) => e.id === col.id);
                const isPast = incomeEvt ? incomeEvt.expectedDate < todayStr : false;

                return (
                  <th
                    key={col.id}
                    className="p-3 font-bold text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[160px]"
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

                    {/* Column Action Buttons */}
                    {(() => {
                      const colState = columnStateMap[col.id] ?? "AUTO";
                      return (
                        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                          {colState === "CONFIRMED" ? (
                            <button
                              type="button"
                              onClick={() => setActivePaydayEventId(col.id)}
                              className="text-xs font-bold text-zinc-500 hover:text-zinc-700 hover:underline cursor-pointer transition-colors px-1 py-0.5"
                            >
                              {t("matrix.viewSplit", { defaultValue: "View Split" })}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setActivePaydayEventId(col.id)}
                                className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-1 py-0.5"
                              >
                                {t("matrix.reviewSplit", { defaultValue: "Review Split" })}
                              </button>
                              {colState === "AUTO" && (
                                <button
                                  type="button"
                                  disabled={savingColId === col.id}
                                  onClick={() => handleSaveAutoSplit(col.id)}
                                  className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-1 rounded border border-emerald-200 disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                  {savingColId === col.id ? "…" : t("matrix.saveSplit", { defaultValue: "Save Split" })}
                                </button>
                              )}
                              {colState === "SAVED" && (
                                <>
                                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-blue-100 text-blue-700 border border-blue-200">
                                    {t("matrix.savedBadge", { defaultValue: "SAVED" })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setColToRevert(col.id)}
                                    className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer transition-colors px-1 py-0.5"
                                  >
                                    {t("matrix.revert", { defaultValue: "Revert" })}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setIncomeToDelete(col.id)}
                            className="text-xs font-semibold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors px-1 py-0.5"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })()}

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
        title={t("matrix.revertDialogTitle", { defaultValue: "Revert Income Split" })}
        description={t("matrix.revertDialogDescription", { defaultValue: "This will remove your saved Income Split for this payday and revert to automatic calculation. Continue?" })}
        confirmLabel={t("matrix.revertDialogConfirm", { defaultValue: "Revert" })}
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
