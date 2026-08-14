"use client";

import React from "react";

interface SetupDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SetupDiscardModal({ isOpen, onClose, onConfirm }: SetupDiscardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-zinc-200">
        <h3 className="text-lg font-black text-[#1B2B4B]">Discard Changes?</h3>
        <p className="text-xs text-zinc-500 font-medium">
          Are you sure you want to leave setup? Any un-saved setup changes will be discarded.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
