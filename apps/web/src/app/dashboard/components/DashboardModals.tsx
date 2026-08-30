"use client";

import React from "react";
import { QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import PaydayPreviewModal from "@/components/web/PaydayPreviewModal";
import { BankReconcileModal, BankReconcileModalProps } from "@/components/web/dashboard/BankReconcileModal";

export interface DashboardModalsProps {
  reconciliationState?: BankReconcileModalProps | null;
  moveMoneyOpen: boolean;
  onCloseMoveMoney: () => void;
  paydayPreviewEventId: string | null;
  onClosePaydayPreview: () => void;
  onSuccessPaydayPreview: () => void;
}

export function DashboardModals({
  reconciliationState,
  moveMoneyOpen,
  onCloseMoveMoney,
  paydayPreviewEventId,
  onClosePaydayPreview,
  onSuccessPaydayPreview,
}: DashboardModalsProps) {
  return (
    <>
      {reconciliationState && reconciliationState.reconcilingAccountId && (
        <BankReconcileModal {...reconciliationState} />
      )}

      {moveMoneyOpen && (
        <QuickActionDrawer
          onClose={onCloseMoveMoney}
          initialTab="TRANSFER"
        />
      )}

      {paydayPreviewEventId && (
        <PaydayPreviewModal
          isOpen={!!paydayPreviewEventId}
          incomeEventId={paydayPreviewEventId}
          onClose={onClosePaydayPreview}
          onSuccess={onSuccessPaydayPreview}
        />
      )}
    </>
  );
}
