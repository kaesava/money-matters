import React from 'react';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
}

export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      hint,
      required,
      autoFocus,
      disabled,
      id,
      placeholder = '••••••',
      className = '',
      containerClassName = '',
      labelClassName = '',
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = e.target.value.replace(/\D/g, '').slice(0, 6);
      onChange(sanitized);
    };

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <FormLabel htmlFor={inputId} required={required} className={labelClassName}>
            {label}
          </FormLabel>
        )}
        {hint && <p className="text-xs text-slate-500 mb-1.5 font-medium">{hint}</p>}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full text-center tracking-[0.5em] text-xl font-mono font-bold px-3.5 py-2.5 rounded-xl border transition-colors ${
            error
              ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/20'
              : 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''} ${className}`}
        />
        <FormFieldError error={error} />
      </div>
    );
  }
);

OtpInput.displayName = 'OtpInput';
