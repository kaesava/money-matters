'use client';

import React, { useState } from 'react';
import { ModalDialog } from './ModalDialog';
import { Button } from './Button';
import { t } from '@money-matters/i18n';

export interface TypedConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  confirmPhrase: string;
  confirmLabel: string;
  confirmButtonText: string;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
  isLoading?: boolean;
}

export function TypedConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  confirmPhrase,
  confirmLabel,
  confirmButtonText,
  variant = 'danger',
  children,
  isLoading = false,
}: TypedConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const handleClose = () => {
    setTyped('');
    onClose();
  };

  const handleConfirm = async () => {
    if (typed.trim() === confirmPhrase.trim()) {
      await onConfirm();
      setTyped('');
    }
  };

  const isMatch = typed.trim() === confirmPhrase.trim();

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {children ? <div className="space-y-2">{children}</div> : null}

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            {confirmLabel}
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] font-bold"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            disabled={!isMatch || isLoading}
            loading={isLoading}
            onClick={handleConfirm}
          >
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
