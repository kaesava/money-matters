'use client';

import React, { useId } from 'react';
import { FormLabel } from '../FormLabel';
import { FormFieldError } from '../FormFieldError';

export interface DatePickerFieldProps {
  label?: string;
  value?: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
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
  error,
  hint,
  id,
}: DatePickerFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      {hint && <p className="text-xs text-slate-500 mb-1.5 font-medium">{hint}</p>}
      <input
        id={inputId}
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
      <FormFieldError error={error} />
    </div>
  );
}
