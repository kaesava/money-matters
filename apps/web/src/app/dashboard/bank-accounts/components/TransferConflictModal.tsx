"use client";

import React from "react";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-amber-200 shadow-xl space-y-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl">
          ⚠️
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[#1B2B4B]">Link Category Transfer Warning</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            <strong>{conflictModalInfo.typeLabel}</strong> is currently linked to <strong>{conflictModalInfo.previousOwnerName}</strong>.
          </p>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Linking it to <strong>{accName || "this account"}</strong> will automatically unlink it from <strong>{conflictModalInfo.previousOwnerName}</strong> when you save.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
