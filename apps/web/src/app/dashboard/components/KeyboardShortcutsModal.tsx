"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { ModalDialog } from "@money-matters/ui/web";

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="text-[#2563eb]">⌘</span> {t("keyboardShortcuts.title")}
        </span>
      }
      maxWidthClass="max-w-sm"
    >
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-zinc-700">{t("keyboardShortcuts.askPenny")}</span>
          <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono font-bold text-zinc-600">⌘K / Ctrl+K</kbd>
        </div>
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
    </ModalDialog>
  );
}
