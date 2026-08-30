"use client";

import React, { useEffect, useId } from "react";
import { t } from "@money-matters/i18n";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  isLoading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const defaultConfirmLabel = t("common.confirm");
  const defaultCancelLabel = t("common.cancel");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Dialog container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        <div id={descId} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {description}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel || defaultCancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmLabel || defaultConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
