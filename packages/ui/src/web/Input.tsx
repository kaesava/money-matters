import React from 'react';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  labelClassName?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, labelClassName = '', containerClassName = '', id, onChange, type = 'text', required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || props.name || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;
      let val = e.target.value;

      if (type === 'number') {
        // Enforce max 12 digits for numbers defensively
        val = val.slice(0, 12);
      } else if (type === 'text' || !type) {
        // Strip dangerous script/HTML characters (< and >) completely
        val = val.replace(/[<>]/g, '');
      }

      e.target.value = val;
      onChange(e);
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
          type={type}
          onChange={handleChange}
          className={`ui-input ${className}`}
          {...props}
        />
        <FormFieldError error={error} />
      </div>
    );
  }
);

Input.displayName = 'Input';
