"use client";

import React from "react";
import { ReconciliationModal, PoolItem } from "@/components/ReconciliationModal";

export interface BankReconcileModalProps {
  reconcilingAccountId: string | null;
  accountName?: string;
  onClose: () => void;
  expectedBalance: number;
  newBalance: number;
  pools: PoolItem[];
  onConfirm: (selectedPoolId: string) => Promise<void>;
  onOpenTransferModal?: () => void;
}

export function BankReconcileModal({
  reconcilingAccountId,
  accountName = "Bank Account",
  onClose,
  expectedBalance,
  newBalance,
  pools,
  onConfirm,
  onOpenTransferModal,
}: BankReconcileModalProps) {
  if (!reconcilingAccountId) return null;

  return (
    <ReconciliationModal
      isOpen={!!reconcilingAccountId}
      onClose={onClose}
      accountName={accountName}
      expectedBalance={expectedBalance}
      newBalance={newBalance}
      pools={pools}
      onConfirm={onConfirm}
      onOpenTransferModal={onOpenTransferModal}
    />
  );
}
