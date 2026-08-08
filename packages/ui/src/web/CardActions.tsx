'use client';

import React from 'react';
import { Edit2, ChevronRight } from 'lucide-react';
import { t } from '@money-matters/i18n';

export interface CardActionsProps {
  onEdit?: (e: React.MouseEvent) => void;
  onChevronClick?: (e: React.MouseEvent) => void;
  editTitle?: string;
}

export function CardActions({ onEdit, onChevronClick, editTitle }: CardActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(e);
          }}
          title={editTitle || t('common.edit', { defaultValue: 'Edit' })}
          className="p-1 rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-100 transition-colors"
          type="button"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      <div
        onClick={(e) => {
          if (onChevronClick) {
            e.stopPropagation();
            onChevronClick(e);
          }
        }}
        className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-650 transition-colors shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}
