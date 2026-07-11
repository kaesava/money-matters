import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'primary', children, ...props }, ref) => {
    let variantClasses = '';
    switch (variant) {
      case 'success':
        variantClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        break;
      case 'danger':
        variantClasses = 'bg-rose-50 text-rose-700 border border-rose-200';
        break;
      case 'warning':
        variantClasses = 'bg-amber-50 text-amber-700 border border-amber-200';
        break;
      case 'primary':
      default:
        variantClasses = 'bg-brand-light text-brand border border-hairline';
        break;
    }

    return (
      <span
        ref={ref}
        className={`ui-badge ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
