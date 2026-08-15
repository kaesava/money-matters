import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', loading, children, ...props }, ref) => {
    const baseClass = variant === 'primary' ? 'ui-btn-primary' : 'ui-btn-secondary';
    return (
      <button
        ref={ref}
        className={`${baseClass} ${className} relative flex items-center justify-center font-bold transition-all disabled:opacity-85 disabled:cursor-not-allowed`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" className="text-current" />
          </span>
        )}
        <span className={loading ? "opacity-0 pointer-events-none flex items-center justify-center gap-2" : "flex items-center justify-center gap-2"}>
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
