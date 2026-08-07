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
        className={`${baseClass} ${className} flex items-center justify-center gap-2`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
