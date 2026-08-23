"use client";

import React from "react";
import { QuickActionDrawer } from "../../../components/web/QuickExpenseDrawer";
import PaydayPreviewModal from "@/components/web/PaydayPreviewModal";
import { BankReconcileModal } from "@/components/web/dashboard/BankReconcileModal";

export interface DashboardModalsProps {
  reconcilingAccountId: string | null;
  onCloseReconcile: () => void;
  reconcileActualAmount: string;
  setReconcileActualAmount: (val: string) => void;
  reconcileTargetCategoryId: string;
  setReconcileTargetCategoryId: (val: string) => void;
  categories: Array<{ id: string; name: string; type?: string; currentBalance?: string }>;
  isReconcilePending: boolean;
  onSubmitReconcile: (e: React.FormEvent) => void;
  moveMoneyOpen: boolean;
  onCloseMoveMoney: () => void;
  paydayPreviewEventId: string | null;
  onClosePaydayPreview: () => void;
  onSuccessPaydayPreview: () => void;
}

export function DashboardModals({
  reconcilingAccountId,
  onCloseReconcile,
  reconcileActualAmount,
  setReconcileActualAmount,
  reconcileTargetCategoryId,
  setReconcileTargetCategoryId,
  categories,
  isReconcilePending,
  onSubmitReconcile,
  moveMoneyOpen,
  onCloseMoveMoney,
  paydayPreviewEventId,
  onClosePaydayPreview,
  onSuccessPaydayPreview,
}: DashboardModalsProps) {
  return (
    <>
      {reconcilingAccountId && (
        <BankReconcileModal
          reconcilingAccountId={reconcilingAccountId}
          onClose={onCloseReconcile}
          reconcileActualAmount={reconcileActualAmount}
          setReconcileActualAmount={setReconcileActualAmount}
          reconcileTargetCategoryId={reconcileTargetCategoryId}
          setReconcileTargetCategoryId={setReconcileTargetCategoryId}
          categories={categories}
          isPending={isReconcilePending}
          onSubmit={onSubmitReconcile}
        />
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
