'use client';

import React from 'react';

export interface DatePickerFieldProps {
  label: string;
  value?: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
}

export function DatePickerField({
  label,
  value = '',
  onChange,
  required = false,
  className = '',
}: DatePickerFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type="date"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui-input w-full text-sm bg-white"
      />
    </div>
  );
}
