"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { ConfirmDialog } from "@money-matters/ui/web";
import { QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import { AffordCheckModal } from "../../../components/web/AffordCheckModal";
import { ReconciliationModal, PoolItem } from "../../../components/ReconciliationModal";

export interface DashboardModalsProps {
  quickDrawerOpen: boolean;
  onCloseQuickDrawer: () => void;
  quickDrawerInitialTab: "DEBIT" | "CREDIT" | "TRANSFER";
  isMoveMoneyOpen: boolean;
  onCloseMoveMoney: () => void;
  incomeToDelete: { id: string; name: string } | null;
  onConfirmDeleteIncome: () => Promise<void>;
  onCloseDeleteIncome: () => void;
  isAffordModalOpen: boolean;
  affordInitialAmount: string;
  onCloseAffordModal: () => void;
  reconcileState: {
    accountName: string;
    accountId: string;
    newBalance: number;
    expectedBalance: number;
    unbudgetedBuffer: number;
    pools: PoolItem[];
  } | null;
  onCloseReconcile: () => void;
  onConfirmReconcile: (
    splits: Array<{ poolId: string; adjustment: string }>,
    actualBalance: string,
    reason?: string
  ) => Promise<void>;
  onOpenTransferModal: () => void;
}

export function DashboardModals({
  quickDrawerOpen,
  onCloseQuickDrawer,
  quickDrawerInitialTab,
  isMoveMoneyOpen,
  onCloseMoveMoney,
  incomeToDelete,
  onConfirmDeleteIncome,
  onCloseDeleteIncome,
  isAffordModalOpen,
  affordInitialAmount,
  onCloseAffordModal,
  reconcileState,
  onCloseReconcile,
  onConfirmReconcile,
  onOpenTransferModal,
}: DashboardModalsProps) {
  return (
    <>
      {quickDrawerOpen && (
        <QuickActionDrawer
          onClose={onCloseQuickDrawer}
          initialTab={quickDrawerInitialTab}
        />
      )}

      {isMoveMoneyOpen && (
        <QuickActionDrawer
          onClose={onCloseMoveMoney}
          initialTab="TRANSFER"
        />
      )}

      {incomeToDelete && (
        <ConfirmDialog
          isOpen={!!incomeToDelete}
          title={t("common.deleteIncomeTitle")}
          description={t("common.deleteExpensePrompt", {
            name: incomeToDelete.name,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          onConfirm={onConfirmDeleteIncome}
          onClose={onCloseDeleteIncome}
        />
      )}

      {isAffordModalOpen && (
        <AffordCheckModal
          isOpen={isAffordModalOpen}
          initialAmount={affordInitialAmount}
          onClose={onCloseAffordModal}
        />
      )}

      {reconcileState && (
        <ReconciliationModal
          isOpen={Boolean(reconcileState)}
          onClose={onCloseReconcile}
          accountName={reconcileState.accountName}
          expectedBalance={reconcileState.expectedBalance}
          initialActualBalance={reconcileState.newBalance}
          unbudgetedBuffer={reconcileState.unbudgetedBuffer}
          pools={reconcileState.pools}
          onConfirm={onConfirmReconcile}
          onOpenTransferModal={onOpenTransferModal}
        />
      )}
    </>
  );
}
