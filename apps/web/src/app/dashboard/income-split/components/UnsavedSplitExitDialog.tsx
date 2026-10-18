"use client";

import React, { useEffect, useState, useId } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { t } from "@money-matters/i18n";
import { Button, useModalDismiss } from "@money-matters/ui/web";

export interface UnsavedSplitExitDialogProps {
  isOpen: boolean;
  isDeficit: boolean;
  deficitAmount?: string;
  submitting?: boolean;
  onClose: () => void;
  onDiscardAndExit: () => void;
  onSaveAndExit?: () => void;
}

export function UnsavedSplitExitDialog({
  isOpen,
  isDeficit,
  deficitAmount = "$0.00",
  submitting = false,
  onClose,
  onDiscardAndExit,
  onSaveAndExit,
}: UnsavedSplitExitDialogProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useModalDismiss({
    id: `unsaved-split-exit-dialog-${titleId}`,
    isOpen,
    onDismiss: () => {
      if (!submitting) onClose();
    },
    isBlocked: submitting,
  });

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 text-center">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
            isDeficit
              ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900"
              : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900"
          }`}
        >
          {isDeficit ? <AlertCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>

        <div>
          <h4 id={titleId} className="text-base font-extrabold text-[#1B2B4B] dark:text-zinc-100">
            {isDeficit ? t("paydayDrawer.deficitExitTitle") : t("paydayDrawer.unsavedChangesTitle")}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
            {isDeficit
              ? t("paydayDrawer.deficitExitDesc", { amount: deficitAmount })
              : t("paydayDrawer.unsavedChangesDesc")}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {isDeficit ? (
            <>
              <Button type="button" variant="primary" onClick={onClose} className="w-full">
                {t("paydayDrawer.keepEditing")}
              </Button>
              <Button type="button" variant="danger" onClick={onDiscardAndExit} className="w-full">
                {t("paydayDrawer.discardAndExit")}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={onSaveAndExit}
                loading={submitting}
                className="w-full"
              >
                {t("paydayDrawer.saveAndExit")}
              </Button>
              <Button type="button" variant="danger" onClick={onDiscardAndExit} className="w-full">
                {t("paydayDrawer.discardAndExit")}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} className="w-full">
                {t("paydayDrawer.keepEditing")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
