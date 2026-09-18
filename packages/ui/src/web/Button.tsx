import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
}

const VARIANT_FALLBACK_STYLES: Record<string, React.CSSProperties> = {
  primary: { backgroundColor: '#2563eb', color: '#ffffff' },
  danger: { backgroundColor: '#ba1a1a', color: '#ffffff' },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, loadingText: _loadingText, children, style, ...props }, ref) => {
    let variantClass = 'bg-[#2563eb] hover:bg-blue-700 text-white shadow-xs';
    if (variant === 'secondary') {
      variantClass = 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700';
    } else if (variant === 'danger') {
      variantClass = 'bg-[#ba1a1a] hover:bg-red-800 text-white shadow-xs';
    } else if (variant === 'ghost') {
      variantClass = 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300';
    }

    let sizeClass = 'px-4 py-2 text-sm rounded-xl';
    if (size === 'sm') {
      sizeClass = 'px-3 py-1.5 text-xs rounded-lg';
    } else if (size === 'lg') {
      sizeClass = 'px-5 py-2.5 text-base rounded-xl';
    }

    const mergedStyle = {
      ...VARIANT_FALLBACK_STYLES[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        style={mergedStyle}
        className={`relative inline-flex items-center justify-center font-bold whitespace-nowrap transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantClass} ${sizeClass} ${className}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner size="sm" className="text-current" />
            </span>
            <span className="opacity-0 pointer-events-none inline-flex items-center justify-center gap-2 whitespace-nowrap">
              {children}
            </span>
          </>
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
