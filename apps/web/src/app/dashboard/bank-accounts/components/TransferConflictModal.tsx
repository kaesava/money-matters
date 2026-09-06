"use client";

import React from "react";
import { ConfirmDialog } from "@money-matters/ui/web";

export interface ConflictModalInfo {
  type: "EVERYDAY" | "REGULAR" | "GOAL";
  typeLabel: string;
  previousOwnerName: string;
}

export interface TransferConflictModalProps {
  conflictModalInfo: ConflictModalInfo | null;
  accName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TransferConflictModal({
  conflictModalInfo,
  accName,
  onCancel,
  onConfirm,
}: TransferConflictModalProps) {
  if (!conflictModalInfo) return null;

  return (
    <ConfirmDialog
      isOpen={!!conflictModalInfo}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Link Category Transfer Warning"
      confirmLabel="Confirm Transfer"
      cancelLabel="Cancel"
      variant="warning"
      description={
        <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            <strong>{conflictModalInfo.typeLabel}</strong> is currently linked to <strong>{conflictModalInfo.previousOwnerName}</strong>.
          </p>
          <p>
            Linking it to <strong>{accName || "this account"}</strong> will automatically unlink it from <strong>{conflictModalInfo.previousOwnerName}</strong> when you save.
          </p>
        </div>
      }
    />
  );
}
