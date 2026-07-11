'use client';

import React from 'react';
import { DatePickerField } from './fields/DatePickerField';
import { AmountCentInput } from './fields/AmountCentInput';
import { GenericSelectField } from './fields/GenericSelectField';
import { Input } from './Input';
import { t } from '@money-matters/i18n';

export interface FormFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'cents' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[]; // For select type
  placeholder?: string;
  helperText?: string;
}

export interface GenericEditFormProps {
  title: string;
  values: any;
  onChange: (key: string, val: any) => void;
  fields?: FormFieldDefinition[];
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>; // If provided, shows a Delete button
  isSubmitting?: boolean;
  isDeleting?: boolean;
  error?: string | null;
  children?: React.ReactNode; // For custom layout overrides
}

export function GenericEditForm({
  title,
  values,
  onChange,
  fields = [],
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
  error,
  children,
}: GenericEditFormProps) {
  const handleDeleteClick = async () => {
    if (!onDelete) return;
    if (confirm(t('common.confirmDelete', { defaultValue: 'Are you sure you want to delete this?' }))) {
      await onDelete();
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col h-full justify-between">
      {/* Scrollable Form Body */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">{title}</h2>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {fields.map((f) => {
            const val = values[f.key] ?? '';
            
            if (f.type === 'date') {
              return (
                <DatePickerField
                  key={f.key}
                  label={f.label}
                  value={val}
                  onChange={(v) => onChange(f.key, v)}
                  required={f.required}
                />
              );
            }
            if (f.type === 'cents') {
              return (
                <AmountCentInput
                  key={f.key}
                  label={f.label}
                  value={Number(val || 0)}
                  onChange={(v) => onChange(f.key, v)}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              );
            }
            if (f.type === 'select' && f.options) {
              return (
                <GenericSelectField
                  key={f.key}
                  label={f.label}
                  value={val}
                  onChange={(v) => onChange(f.key, v)}
                  options={f.options}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              );
            }
            if (f.type === 'textarea') {
              return (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    required={f.required}
                    placeholder={f.placeholder}
                    value={val}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="ui-input w-full text-sm bg-white min-h-[100px] py-2"
                  />
                </div>
              );
            }
            if (f.type === 'checkbox') {
              return (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={(e) => onChange(f.key, e.target.checked)}
                    className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-600/20 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {f.label}
                  </span>
                </label>
              );
            }
            return (
              <Input
                key={f.key}
                label={f.label}
                type={f.type === 'number' ? 'number' : 'text'}
                required={f.required}
                placeholder={f.placeholder}
                value={val}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="bg-white"
              />
            );
          })}

          {/* Render custom layout children if supplied */}
          {children}
        </div>
      </div>

      {/* Form Action Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
        <div>
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting || isSubmitting}
              className="ui-btn-danger py-2 px-4 text-sm font-semibold disabled:opacity-50"
              type="button"
            >
              {isDeleting ? '...' : t('common.delete', { defaultValue: 'Delete' })}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting || isDeleting}
            className="ui-btn-secondary py-2 px-4 text-sm font-semibold disabled:opacity-50"
            type="button"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isDeleting}
            className="ui-btn-primary py-2 px-4 text-sm font-semibold disabled:opacity-50"
          >
            {isSubmitting ? '...' : t('common.save', { defaultValue: 'Save' })}
          </button>
        </div>
      </div>
    </form>
  );
}
