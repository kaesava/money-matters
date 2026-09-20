'use client';

import React, { useEffect, useState, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { t } from '@money-matters/i18n';
import { Button } from './Button';
import { useModalDismiss } from './modalStack';

export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  isDirty?: boolean;
  onSave?: () => void | Promise<void>;
  children: React.ReactNode;
  maxWidthClass?: string;
  maxWidth?: string;
}

export function ModalDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  isDirty = false,
  onSave,
  children,
  maxWidthClass,
  maxWidth = 'max-w-lg',
}: ModalDialogProps) {
  const [mounted, setMounted] = useState(false);
  const effectiveMaxWidth = maxWidthClass || maxWidth;
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useModalDismiss({
    id: `modal-dialog-${titleId}`,
    isOpen: isOpen && !showConfirm,
    onDismiss: handleRequestClose,
    isBlocked: saving,
  });

  useModalDismiss({
    id: `modal-confirm-${titleId}`,
    isOpen: showConfirm,
    onDismiss: () => setShowConfirm(false),
    isBlocked: saving,
  });

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        onClick={handleRequestClose}
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full ${effectiveMaxWidth} bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between gap-4">
          <div>
            <h3 id={titleId} className="text-base font-extrabold text-[#1B2B4B]">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-[#1B2B4B]">
                {t('modals.unsavedChanges.title')}
              </h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                {t('modals.unsavedChanges.description')}
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {onSave && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmSave}
                  loading={saving}
                  className="w-full"
                >
                  {t('common.saveChanges')}
                </Button>
              )}
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmDiscard}
                className="w-full"
              >
                {t('modals.unsavedChanges.discard')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                className="w-full"
              >
                {t('modals.unsavedChanges.keepEditing')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export default ModalDialog;
