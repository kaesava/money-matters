'use client';

import React from 'react';
import { Edit2, ChevronRight } from 'lucide-react';
import { t } from '@money-matters/i18n';

export interface RowActionsProps {
  onEdit?: (e: React.MouseEvent) => void;
  editTitle?: string;
  isArchived?: boolean;
}

export function RowActions({ onEdit, editTitle, isArchived }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {!isArchived && onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(e);
          }}
          title={editTitle || t('common.edit', { defaultValue: 'Edit' })}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 transition-colors"
          type="button"
        >
          <Edit2 className="w-4.5 h-4.5" />
        </button>
      )}
      <ChevronRight className="w-5 h-5 text-slate-300" />
    </div>
  );
}
