"use client";

import React from "react";
import { QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import { PaydayActionDrawer } from "@/components/web/PaydayActionDrawer";
import { BankReconcileModal, BankReconcileModalProps } from "@/components/web/dashboard/BankReconcileModal";

export interface DashboardModalsProps {
  reconciliationState?: BankReconcileModalProps | null;
  moveMoneyOpen: boolean;
  onCloseMoveMoney: () => void;
  paydayPreviewEventId: string | null;
  paydayActionMode?: "MARK_RECEIVED" | "ALLOCATE";
  onClosePaydayPreview: () => void;
  onSuccessPaydayPreview: () => void;
}

export function DashboardModals({
  reconciliationState,
  moveMoneyOpen,
  onCloseMoveMoney,
  paydayPreviewEventId,
  paydayActionMode = "MARK_RECEIVED",
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
        <PaydayActionDrawer
          isOpen={!!paydayPreviewEventId}
          incomeEventId={paydayPreviewEventId}
          mode={paydayActionMode}
          onClose={onClosePaydayPreview}
          onSuccess={onSuccessPaydayPreview}
        />
      )}
    </>
  );
}
