"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[#1B2B4B] mb-6 flex items-center gap-2">
          <span className="text-[#2563eb]">⌘</span> {t("keyboardShortcuts.title")}
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-700">{t("keyboardShortcuts.quickExpense")}</span>
            <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono font-bold text-zinc-600">N</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-700">{t("keyboardShortcuts.search")}</span>
            <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono font-bold text-zinc-600">/</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-700">{t("keyboardShortcuts.shortcuts")}</span>
            <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono font-bold text-zinc-600">?</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-700">{t("keyboardShortcuts.close")}</span>
            <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono font-bold text-zinc-600">Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
