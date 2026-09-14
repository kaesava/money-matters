'use client';

import React, { useId } from 'react';
import { FormLabel } from '../FormLabel';
import { FormFieldError } from '../FormFieldError';

export interface SelectOption {
  value: string;
  label: string;
}

export interface GenericSelectFieldProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function GenericSelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  hint,
  id,
  className = '',
  placeholder,
}: GenericSelectFieldProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <FormLabel htmlFor={selectId} required={required}>
          {label}
        </FormLabel>
      )}
      {hint && <p className="text-xs text-slate-500 mb-1.5 font-medium">{hint}</p>}
      <select
        id={selectId}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui-input w-full text-sm bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FormFieldError error={error} />
    </div>
  );
}
