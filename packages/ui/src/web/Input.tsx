import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, labelClassName = '', containerClassName = '', id, onChange, type = 'text', required, ...props }, ref) => {
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
          <label htmlFor={inputId} className={`ui-label ${labelClassName}`}>
            {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          onChange={handleChange}
          className={`ui-input ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-semibold text-rose-600 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
