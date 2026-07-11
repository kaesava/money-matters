'use client';

import React from 'react';
import { SlideOverDrawer } from './SlideOverDrawer';

export interface DrawerField {
  label: string;
  value: React.ReactNode;
  isImportant?: boolean;
}

export interface DrawerAction {
  label: string;
  icon?: React.ComponentType<any>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface GenericDetailDrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  fields: DrawerField[];
  children?: React.ReactNode;
  actions?: DrawerAction[];
  widthClass?: string;
}

export function GenericDetailDrawer({
  title,
  subtitle,
  onClose,
  onBack,
  fields,
  children,
  actions = [],
  widthClass = 'max-w-md',
}: GenericDetailDrawerProps) {
  return (
    <SlideOverDrawer
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      onBack={onBack}
      widthClass={widthClass}
    >
      <div className="flex flex-col h-full justify-between">
        {/* Main attributes */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-y-4">
            {fields.map((f, idx) => (
              <div key={idx} className={f.isImportant ? 'border-b border-slate-100 pb-3' : ''}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {f.label}
                </label>
                <div className={`mt-1 text-slate-800 ${f.isImportant ? 'text-base font-bold text-slate-900' : 'text-sm font-medium'}`}>
                  {f.value || '-'}
                </div>
              </div>
            ))}
          </div>

          {/* Extra details / logs / panels */}
          {children && <div className="border-t border-slate-100 pt-6 space-y-4">{children}</div>}
        </div>

        {/* Footer Actions */}
        {actions.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            {actions.map((act, idx) => {
              const btnClass =
                act.variant === 'primary'
                  ? 'ui-btn-primary py-2 px-4 text-sm font-semibold'
                  : act.variant === 'danger'
                  ? 'ui-btn-danger py-2 px-4 text-sm font-semibold'
                  : 'ui-btn-secondary py-2 px-4 text-sm font-semibold';
                  
              const Icon = act.icon;
              return (
                <button
                  key={idx}
                  onClick={act.onClick}
                  className={`inline-flex items-center gap-1.5 ${btnClass}`}
                  type="button"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {act.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SlideOverDrawer>
  );
}
