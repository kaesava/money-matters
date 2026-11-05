"use client";

import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { PaydayTransferModal } from "./PaydayTransferModal";
import { EnvelopeDetailDrawer } from "../../income-and-bills/components/EnvelopeDetailDrawer";
import { EnvelopeFormModal } from "../../../../components/web/EnvelopeFormModal";
import { UnsavedSplitExitDialog } from "./UnsavedSplitExitDialog";

export interface IncomeSplitModalsProps {
  showTransferModal: boolean;
  onCloseTransferModal: () => void;
  receivingAccountId?: string | null;
  pools: Array<{
    id: string;
    name: string;
    bankAccountId?: string | null;
  }>;
  linesMap: Record<string, string>;
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  bankAccounts: Array<{ id: string; name: string }>;
  activeDrawerPool: { id: string; name: string } | null;
  onCloseDrawerPool: () => void;
  onEditPoolFromDrawer: (pool: React.ComponentProps<typeof EnvelopeFormModal>["envelopeToEdit"]) => void;
  isPoolModalOpen: boolean;
  onClosePoolModal: () => void;
  poolToEdit: React.ComponentProps<typeof EnvelopeFormModal>["envelopeToEdit"] | null;
  onSuccessPoolModal: () => void;
  showConfirmWarning: boolean;
  onCloseConfirmWarning: () => void;
  onConfirmSplit: () => void;
  showRecalculateConfirm: boolean;
  onCloseRecalculateConfirm: () => void;
  onConfirmRecalculate: () => void;
  isSavedPlan: boolean;
  showExitDialog: boolean;
  isDeficit: boolean;
  deficitAmount: string;
  submitting: boolean;
  onCloseExitDialog: () => void;
  onDiscardAndExit: () => void;
  showDeleteConfirm: boolean;
  onCloseDeleteConfirm: () => void;
  onConfirmDeleteIncome: () => void;
}

export function IncomeSplitModals({
  showTransferModal,
  onCloseTransferModal,
  receivingAccountId,
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  bankAccounts,
  activeDrawerPool,
  onCloseDrawerPool,
  onEditPoolFromDrawer,
  isPoolModalOpen,
  onClosePoolModal,
  poolToEdit,
  onSuccessPoolModal,
  showConfirmWarning,
  onCloseConfirmWarning,
  onConfirmSplit,
  showRecalculateConfirm,
  onCloseRecalculateConfirm,
  onConfirmRecalculate,
  isSavedPlan,
  showExitDialog,
  isDeficit,
  deficitAmount,
  submitting,
  onCloseExitDialog,
  onDiscardAndExit,
  showDeleteConfirm,
  onCloseDeleteConfirm,
  onConfirmDeleteIncome,
}: IncomeSplitModalsProps) {
  return (
    <>
      <PaydayTransferModal
        isOpen={showTransferModal}
        onClose={onCloseTransferModal}
        receivingAccountId={receivingAccountId}
        pools={pools}
        linesMap={linesMap}
        sweepPoolId={sweepPoolId}
        sweepPoolRemainder={sweepPoolRemainder}
        bankAccounts={bankAccounts}
      />

      <EnvelopeDetailDrawer
        isOpen={Boolean(activeDrawerPool)}
        categoryName={activeDrawerPool?.name || ""}
        categoryId={activeDrawerPool?.id}
        onClose={onCloseDrawerPool}
        onEditPool={onEditPoolFromDrawer}
      />

      <EnvelopeFormModal
        isOpen={isPoolModalOpen}
        onClose={onClosePoolModal}
        envelopeToEdit={poolToEdit}
        onSuccess={onSuccessPoolModal}
      />

      <ConfirmDialog
        isOpen={showConfirmWarning}
        onClose={onCloseConfirmWarning}
        onConfirm={onConfirmSplit}
        title={t("paydayDrawer.confirmWarningTitle")}
        description={t("paydayDrawer.confirmWarningDescription")}
        confirmLabel={t("paydayDrawer.confirmWarningConfirm")}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showRecalculateConfirm}
        onClose={onCloseRecalculateConfirm}
        onConfirm={onConfirmRecalculate}
        title={
          isSavedPlan
            ? t("paydayDrawer.recalculateConfirmTitle")
            : t("paydayDrawer.recalculateUnlockedConfirmTitle")
        }
        description={
          isSavedPlan
            ? t("paydayDrawer.recalculateConfirmDescription")
            : t("paydayDrawer.recalculateUnlockedConfirmDescription")
        }
        confirmLabel={
          isSavedPlan
            ? t("paydayDrawer.unlockAndRecalculate")
            : t("paydayDrawer.recalculate")
        }
        variant="danger"
      />

      <UnsavedSplitExitDialog
        isOpen={showExitDialog}
        isDeficit={isDeficit}
        deficitAmount={deficitAmount}
        submitting={submitting}
        onClose={onCloseExitDialog}
        onDiscardAndExit={onDiscardAndExit}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={onCloseDeleteConfirm}
        onConfirm={onConfirmDeleteIncome}
        title={t("common.deleteIncomeTitle")}
        description={t("paydayDrawer.deleteDescription")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </>
  );
}
