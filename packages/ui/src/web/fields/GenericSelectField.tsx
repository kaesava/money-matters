'use client';

import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface GenericSelectFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function GenericSelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  className = '',
  placeholder,
}: GenericSelectFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui-input w-full text-sm bg-white cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
