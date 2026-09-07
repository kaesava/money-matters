'use client';

import React from 'react';

export interface DatePickerFieldProps {
  label: string;
  value?: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
}

export function DatePickerField({
  label,
  value = '',
  onChange,
  required = false,
  className = '',
  min,
  max,
  disabled = false,
  id,
}: DatePickerFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key !== 'Tab' && e.key !== 'Escape') {
            e.preventDefault();
          }
        }}
        onChange={(e) => onChange(e.target.value)}
        className="ui-input w-full text-sm bg-white cursor-pointer disabled:opacity-50"
      />
    </div>
  );
}
