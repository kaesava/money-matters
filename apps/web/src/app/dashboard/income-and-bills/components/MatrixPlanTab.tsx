"use client";

import React from "react";
import { EnvelopeDetailDrawer } from "./EnvelopeDetailDrawer";
import { t } from "@money-matters/i18n";
import { InfoTooltip, ConfirmDialog } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import {
  useMatrixPlanData,
  CategoryData,
  IncomeEventData,
  ExpenseEventData,
} from "./matrix/useMatrixPlanData";
import { MatrixTableHeader } from "./matrix/MatrixTableHeader";
import { MatrixCellInput } from "./matrix/MatrixCellInput";

interface MatrixPlanTabProps {
  currentUserId: string;
  categories?: CategoryData[];
  incomeEvents?: IncomeEventData[];
  expenseEvents?: ExpenseEventData[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
}

export function MatrixPlanTab({
  currentUserId: _currentUserId,
  categories: propsCategories = [],
  incomeEvents: propsIncomeEvents = [],
  expenseEvents: propsExpenseEvents = [],
  onMarkPaid,
}: MatrixPlanTabProps) {
  const { locale, userTimezone, fmt } = useLocale();

  const {
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
  } = useMatrixPlanData({
    propsCategories,
    propsIncomeEvents,
    propsExpenseEvents,
  });

  const [showGuidanceBanner, setShowGuidanceBanner] = React.useState(false);

  React.useEffect(() => {
    try {
      const dismissed = localStorage.getItem("mm_matrix_guidance_dismissed");
      if (dismissed !== "true") {
        setShowGuidanceBanner(true);
      }
    } catch {
      setShowGuidanceBanner(true);
    }
  }, []);

  const handleDismissGuidance = () => {
    setShowGuidanceBanner(false);
    try {
      localStorage.setItem("mm_matrix_guidance_dismissed", "true");
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6">
      {showGuidanceBanner && (
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 shadow-xs flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-base">💡</span>
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
              {t("incomeBillsTabs.twelveMonthPlanGuidanceBanner")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissGuidance}
            className="text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 p-1 cursor-pointer"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
            <span>{t("matrix.incomeAllocationGridTitle")}</span>
            <InfoTooltip content={t("matrix.incomeAllocationGridTooltip")} />
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (statusFilter === "ALL" ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              {t("matrix.statusAll")}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (statusFilter === "PENDING" ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              {t("matrix.statusPending")}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("CONFIRMED")}
              className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (statusFilter === "CONFIRMED" ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              {t("matrix.statusConfirmed")}
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setScopeFilter("ALL")}
              className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (scopeFilter === "ALL" ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              {t("common.all")}
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter("SHARED")}
              className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (scopeFilter === "SHARED" ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              {t("common.shared")}
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter("PRIVATE")}
              className={"px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (scopeFilter === "PRIVATE" ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              {t("common.private")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFullHorizon(!showFullHorizon)}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#1B2B4B] dark:text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            {showFullHorizon ? t("matrix.showNext5") : t("matrix.showFull12Events")}
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <MatrixTableHeader
            visibleColumns={visibleColumns}
            incomeEvents={incomeEvents}
            columnStateMap={columnStateMap}
            savingColId={savingColId}
            userTimezone={userTimezone}
            locale={locale}
            returnTo={returnTo}
            fmt={fmt}
            onSaveAutoSplit={handleSaveAutoSplit}
            onResetPlan={(id) => setColToReset(id)}
            onRequestDeleteIncome={(id) => setIncomeToDelete(id)}
          />

          <tbody>
            {projection.groups.map((group) => {
              const isSurplusSection = group.id === "surplus";
              const isCollapsed = isSurplusSection ? false : collapsedGroups[group.id];
              return (
                <React.Fragment key={group.id}>
                  <tr className="bg-zinc-100/70 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-bold text-[#1B2B4B] dark:text-white">
                    <td
                      colSpan={visibleColumns.length + 1}
                      onClick={() => !isSurplusSection && toggleGroup(group.id)}
                      className={"p-3 " + (isSurplusSection ? "" : "cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800") + " transition-colors"}
                    >
                      <div className="flex items-center gap-2">
                        {!isSurplusSection && <span>{isCollapsed ? "▶" : "▼"}</span>}
                        <span>{group.title}</span>
                      </div>
                    </td>
                  </tr>

                  {!isCollapsed &&
                    group.rows.map((row) => (
                      <tr
                        key={row.categoryId}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 p-3 border-r border-zinc-200 dark:border-zinc-800">
                          <div className="flex flex-col">
                            <span
                              onClick={() =>
                                setActiveCategoryForDrawer({
                                  id: row.categoryId,
                                  name: row.categoryName,
                                })
                              }
                              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors"
                            >
                              {row.categoryName}
                            </span>
                            {(() => {
                              const cat = categories.find((c) => c.id === row.categoryId);
                              const curBal = cat ? cat.currentBalance : 0;
                              const rawTarget = cat
                                ? (cat.monthlyAmount ?? cat.targetAmount ?? null)
                                : null;
                              const targetVal = rawTarget != null ? Number(rawTarget) : null;
                              return (
                                <div className="text-[10px] font-medium text-zinc-500 font-mono mt-0.5">
                                  {t("matrix.balanceShort")}: {fmt(curBal)}
                                  {targetVal != null && targetVal > 0 ? (" / Target: " + fmt(targetVal)) : ""}
                                </div>
                              );
                            })()}
                          </div>
                        </td>

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
                              className={"p-2 border-r border-zinc-200 dark:border-zinc-800 text-center transition-colors " + (isSavedCol ? "bg-slate-100/60 dark:bg-zinc-800/40" : "")}
                            >
                              <div className="flex flex-col items-center">
                                <MatrixCellInput
                                  value={cell.allocated}
                                  isSurplusTarget={row.isSurplusTarget}
                                />
                                <span className="text-[10px] font-mono text-zinc-500 font-medium mt-0.5">
                                  {t("matrix.balanceShort")}: {fmt(cell.projectedBalance)}
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

      <EnvelopeDetailDrawer
        isOpen={!!activeCategoryForDrawer}
        onClose={() => setActiveCategoryForDrawer(null)}
        categoryName={activeCategoryForDrawer?.name || ""}
        categoryId={activeCategoryForDrawer?.id}
        events={drawerEvents}
        onMarkPaid={onMarkPaid}
      />

      <ConfirmDialog
        isOpen={!!colToSave}
        onClose={() => setColToSave(null)}
        onConfirm={async () => {
          if (colToSave) {
            const targetId = colToSave;
            setColToSave(null);
            await handleSaveAutoSplit(targetId);
          }
        }}
        title={t("matrix.saveDialogTitle")}
        description={t("matrix.saveDialogDescription")}
        confirmLabel={t("matrix.saveDialogConfirm")}
        variant="primary"
      />

      <ConfirmDialog
        isOpen={!!colToReset}
        onClose={() => setColToReset(null)}
        onConfirm={async () => {
          if (colToReset) {
            const targetId = colToReset;
            setColToReset(null);
            await handleResetPlan(targetId);
          }
        }}
        title={t("paydayDrawer.recalculateConfirmTitle")}
        description={t("paydayDrawer.recalculateConfirmDescription")}
        confirmLabel={t("common.confirm")}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={confirmDeleteIncome}
        title={t("common.deleteIncomeTitle")}
        description={t("common.deleteIncomePrompt")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
}

export { MatrixPlanTab as BulkAllocateTab };