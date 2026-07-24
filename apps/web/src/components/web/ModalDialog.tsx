"use client";
import React, { useEffect, useState, useCallback } from "react";

export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isDirty?: boolean;
  onSave?: () => void | Promise<void>;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function ModalDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  isDirty = false,
  onSave,
  children,
  maxWidthClass = "max-w-lg",
}: ModalDialogProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleConfirmDiscard = () => {
    setShowConfirm(false);
    onClose();
  };

  const handleConfirmSave = async () => {
    if (onSave) {
      setSaving(true);
      try {
        await onSave();
        setShowConfirm(false);
        onClose();
      } finally {
        setSaving(false);
      }
    } else {
      setShowConfirm(false);
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        handleRequestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleRequestClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={handleRequestClose}
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full ${maxWidthClass} bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-[#1B2B4B]">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors font-bold text-sm"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl mx-auto font-bold border border-amber-200">
              ⚠️
            </div>
            <div>
              <h4 className="text-base font-extrabold text-[#1B2B4B]">Unsaved Changes</h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                You have unsaved changes in this form. Would you like to save them before leaving?
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {onSave && (
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-sm"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="w-full py-2 rounded-xl font-bold text-xs text-zinc-500 hover:text-zinc-800 transition-all"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
