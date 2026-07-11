import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, labelClassName = '', containerClassName = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);
    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className={`ui-label ${labelClassName}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
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
