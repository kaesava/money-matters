import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', loading, loadingText, children, ...props }, ref) => {
    const baseClass = variant === 'primary' ? 'ui-btn-primary' : 'ui-btn-secondary';
    return (
      <button
        ref={ref}
        className={`${baseClass} ${className} relative inline-flex items-center justify-center font-bold whitespace-nowrap transition-all disabled:opacity-85 disabled:cursor-not-allowed`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          loadingText ? (
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <Spinner size="sm" className="text-current" />
              <span>{loadingText}</span>
            </span>
          ) : (
            <>
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner size="sm" className="text-current" />
              </span>
              <span className="opacity-0 pointer-events-none inline-flex items-center justify-center gap-2 whitespace-nowrap">
                {children}
              </span>
            </>
          )
        ) : (
          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
            {children}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
