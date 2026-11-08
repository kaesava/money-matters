"use client";

import React from "react";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { IncomeEventInlineCard } from "./IncomeEventInlineCard";
import { IncomeSplitPoolTable } from "./IncomeSplitPoolTable";
import { PaydayCelebrationCard } from "./PaydayCelebrationCard";
import { useLocale } from "../../../../providers/LocaleProvider";
import { ChevronDown } from "lucide-react";
import { useIncomeSplitState } from "./useIncomeSplitState";
import { IncomeSplitModals } from "./IncomeSplitModals";

export interface IncomeSplitScreenProps {
  readonly incomeEventId: string;
  readonly returnTo?: string;
}

export function IncomeSplitScreen({
  incomeEventId,
  returnTo = "/dashboard",
}: IncomeSplitScreenProps) {
  const { fmt } = useLocale();

  const {
    poolsQuery,
    previewQuery,
    bankAccountsQuery,
    pools,
    bankAccounts,
    receivingAccountId,
    actualAmount,
    setActualAmount,
    sourceName,
    setSourceName,
    selectedDate,
    setSelectedDate,
    linesMap,
    initialLinesMap,
    reasoningMap,
    numericActual,
    sweepPool,
    sweepPoolRemainder,
    isDeficit,
    isReadOnly,
    isSavedPlan,
    isConfirmedPlan,
    isFutureDate,
    isDirty,
    submitting,
    everydayAllocated,
    billsAllocated,
    goalsAllocated,
    groupedLines,
    showConfirmWarning,
    setShowConfirmWarning,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showRecalculateConfirm,
    setShowRecalculateConfirm,
    showExitDialog,
    setShowExitDialog,
    activeDrawerPool,
    setActiveDrawerPool,
    poolToEdit,
    setPoolToEdit,
    isPoolModalOpen,
    setIsPoolModalOpen,
    showTableDetails,
    setShowTableDetails,
    showTransferModal,
    setShowTransferModal,
    handleLineAmountChange,
    handleLineReasoningChange,
    attemptExit,
    handleDiscardAndExit,
    handleDiscardEdits,
    handleRecalculateTrigger,
    handleRecalculateSavedConfirmed,
    handleDeleteIncome,
    handleSaveSplit,
    executeConfirmSplit,
  } = useIncomeSplitState({
    incomeEventId,
    returnTo,
  });

  if (previewQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" label={t("common.loading")} direction="col" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <IncomeEventInlineCard
        sourceName={sourceName}
        onSourceNameChange={setSourceName}
        actualAmount={actualAmount}
        onActualAmountChange={setActualAmount}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        isReadOnly={isReadOnly}
        onDeleteIncome={() => setShowDeleteConfirm(true)}
        onBack={attemptExit}
      />

      <PaydayCelebrationCard
        everydayAllocated={everydayAllocated}
        billsAllocated={billsAllocated}
        goalsAllocated={goalsAllocated}
        safeToSpend={sweepPoolRemainder}
        isConfirmed={isConfirmedPlan}
        isLocked={isSavedPlan}
        isDirty={isDirty}
        isFutureDate={isFutureDate}
        submitting={submitting}
        isDeficit={isDeficit}
        strategyName={previewQuery.data?.strategyName}
        onConfirm={() => {
          if (!isFutureDate && !isDeficit && !submitting) {
            setShowConfirmWarning(true);
          }
        }}
        onUnlockAndRecalculate={!isReadOnly ? handleRecalculateTrigger : undefined}
        onRecalculate={!isReadOnly ? handleRecalculateTrigger : undefined}
        onLockSplit={!isReadOnly ? handleSaveSplit : undefined}
        onSaveChanges={!isReadOnly ? handleSaveSplit : undefined}
        onDiscardEdits={!isReadOnly ? handleDiscardEdits : undefined}
        formatCurrency={(amount) => fmt(amount)}
      />

      <div className="flex-1 w-full space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowTableDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span>
              {showTableDetails
                ? t("paydayDrawer.hideDetailedAllocations")
                : t("paydayDrawer.showDetailedAllocations")}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showTableDetails ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {showTableDetails && (
          <IncomeSplitPoolTable
            groups={groupedLines}
            pools={pools}
            sweepPoolId={sweepPool?.id}
            sweepPoolRemainder={sweepPoolRemainder}
            linesMap={linesMap}
            initialLinesMap={initialLinesMap}
            reasoningMap={reasoningMap}
            numericActual={numericActual}
            isReadOnly={isReadOnly}
            onLineAmountChange={handleLineAmountChange}
            onLineReasoningChange={handleLineReasoningChange}
            onOpenPoolDrawer={(poolId, poolName) =>
              setActiveDrawerPool({ id: poolId, name: poolName })
            }
          />
        )}
      </div>

      <IncomeSplitModals
        showTransferModal={showTransferModal}
        onCloseTransferModal={() => {
          setShowTransferModal(false);
          attemptExit();
        }}
        receivingAccountId={receivingAccountId}
        pools={pools}
        linesMap={linesMap}
        sweepPoolId={sweepPool?.id}
        sweepPoolRemainder={sweepPoolRemainder}
        bankAccounts={bankAccounts}
        activeDrawerPool={activeDrawerPool}
        onCloseDrawerPool={() => setActiveDrawerPool(null)}
        onEditPoolFromDrawer={(pool) => {
          setPoolToEdit(pool);
          setIsPoolModalOpen(true);
        }}
        isPoolModalOpen={isPoolModalOpen}
        onClosePoolModal={() => setIsPoolModalOpen(false)}
        poolToEdit={poolToEdit}
        onSuccessPoolModal={() => {
          poolsQuery.refetch();
          previewQuery.refetch();
        }}
        showConfirmWarning={showConfirmWarning}
        onCloseConfirmWarning={() => setShowConfirmWarning(false)}
        onConfirmSplit={executeConfirmSplit}
        showRecalculateConfirm={showRecalculateConfirm}
        onCloseRecalculateConfirm={() => setShowRecalculateConfirm(false)}
        onConfirmRecalculate={handleRecalculateSavedConfirmed}
        isSavedPlan={isSavedPlan}
        showExitDialog={showExitDialog}
        isDeficit={isDeficit}
        deficitAmount={fmt(Math.abs(sweepPoolRemainder))}
        submitting={submitting}
        onCloseExitDialog={() => setShowExitDialog(false)}
        onDiscardAndExit={handleDiscardAndExit}
        showDeleteConfirm={showDeleteConfirm}
        onCloseDeleteConfirm={() => setShowDeleteConfirm(false)}
        onConfirmDeleteIncome={handleDeleteIncome}
      />
    </div>
  );
}
