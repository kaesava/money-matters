'use client';

import React, { useId, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface AmountFieldProps {
  /** Controlled string value — keep as empty string when blank */
  value: string;
  onChange: (value: string) => void;
  /** Called when the input loses focus — after 2dp formatting is applied */
  onBlur?: () => void;
  label?: string;
  error?: string;
  placeholder?: string;
  /** Allow negative values; renders -$X.XX in rose-600 */
  allowNegative?: boolean;
  /** Stepper increment / decrement step (default: 1) */
  step?: number;
  /** Cap on integer digits before the decimal point (default: 10, max total 12 chars) */
  maxIntegerDigits?: number;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  /** Currency code (e.g. 'AUD', 'USD', 'JPY'). Default: 'AUD' */
  currency?: string;
  /** Currency symbol (e.g. '$', '€', '¥'). Derived from currency if not passed */
  currencySymbol?: string;
  /** Decimal places for currency minor units (e.g. 0 for JPY, 2 for AUD/USD). Derived if omitted */
  minorUnits?: number;
  /** Min value enforced on blur (default: 0 when allowNegative is false) */
  min?: number;
  /** Max value enforced on blur */
  max?: number;
}

/**
 * Canonical amount input for the Serene Finance design system.
 *
 * - Dynamic currency prefix (positioned, not concatenated into value string).
 * - On blur: formats to minorUnits dp (0dp for JPY, 2dp for AUD) if numeric; keeps empty if blank.
 * - Custom stacked ChevronUp/ChevronDown steppers (hides native browser spinners).
 * - allowNegative=true renders -$X.XX in rose-600 bold (e.g. bank balance adjustments).
 * - allowNegative=false (default): strips minus characters; clamps to >= 0.
 * - 12-character total input cap; currency-aware decimal digits.
 */
export const AmountField = React.forwardRef<HTMLInputElement, AmountFieldProps>(
  (
    {
      value,
      onChange,
      onBlur,
      label,
      error,
      placeholder = '0.00',
      allowNegative = false,
      step = 1,
      maxIntegerDigits = 10,
      currency = 'AUD',
      currencySymbol,
      minorUnits,
      required = false,
      disabled = false,
      autoFocus = false,
      id,
      name,
      className = '',
      containerClassName = '',
      labelClassName = '',
      min,
      max,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;

    const effectiveMinorUnits =
      minorUnits !== undefined
        ? minorUnits
        : currency?.toUpperCase() === 'JPY'
        ? 0
        : 2;

    const effectiveSymbol =
      currencySymbol ??
      (currency?.toUpperCase() === 'JPY'
        ? '¥'
        : currency?.toUpperCase() === 'EUR'
        ? '€'
        : currency?.toUpperCase() === 'GBP'
        ? '£'
        : '$');

    const effectiveMin = min !== undefined ? min : allowNegative ? undefined : 0;

    /** Sanitise raw user keystrokes — enforce digit/sign/decimal rules. */
    const sanitise = useCallback(
      (raw: string): string => {
        let v = raw;

        if (!allowNegative) {
          v = v.replace(/-/g, '');
        }

        // For zero-decimal currencies (e.g. JPY), disallow decimal points entirely
        if (effectiveMinorUnits === 0) {
          const negPrefix = allowNegative && v.startsWith('-') ? '-' : '';
          v = v.replace(/[^0-9]/g, '');
          if (v.length > maxIntegerDigits) {
            v = v.slice(0, maxIntegerDigits);
          }
          return negPrefix + v;
        }

        // Allow digits, at most one decimal point, and (if allowNegative) leading minus
        const negPrefix = allowNegative && v.startsWith('-') ? '-' : '';
        v = v.replace(/[^0-9.]/g, '');

        // Allow at most one decimal point, and at most effectiveMinorUnits decimal digits
        const parts = v.split('.');
        if (parts.length > 2) {
          v = parts[0] + '.' + parts.slice(1).join('');
        }
        if (parts[1] !== undefined) {
          v = parts[0] + '.' + parts[1].slice(0, effectiveMinorUnits);
        }

        // Cap integer part length
        const integerPart = v.split('.')[0];
        if (integerPart.length > maxIntegerDigits) {
          v = integerPart.slice(0, maxIntegerDigits) + (v.includes('.') ? '.' + v.split('.')[1] : '');
        }

        return negPrefix + v;
      },
      [allowNegative, maxIntegerDigits, effectiveMinorUnits]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(sanitise(e.target.value));
    };

    const handleBlur = () => {
      if (value !== '' && value !== '-') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          let clamped = num;
          if (effectiveMin !== undefined && clamped < effectiveMin) clamped = effectiveMin;
          if (max !== undefined && clamped > max) clamped = max;
          onChange(clamped.toFixed(effectiveMinorUnits));
        }
      }
      onBlur?.();
    };

    const step_ = (delta: number) => {
      if (disabled) return;
      const current = parseFloat(value) || 0;
      const next = current + delta;
      const clamped =
        effectiveMin !== undefined ? Math.max(effectiveMin, next) :
        max !== undefined ? Math.min(max, next) : next;
      const final = max !== undefined ? Math.min(max, clamped) : clamped;
      onChange(final.toFixed(effectiveMinorUnits));
    };

    const isNegative = allowNegative && parseFloat(value) < 0;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`ui-label ${labelClassName}`}
          >
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Leading currency symbol */}
          <span
            className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none ${
              isNegative ? 'text-rose-600 font-bold' : 'text-slate-400'
            }`}
          >
            {effectiveSymbol}
          </span>

          {/* Numeric input — native spinners hidden via Tailwind arbitrary variants */}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={[
              'ui-input w-full pl-7 pr-10 font-mono tabular-nums',
              isNegative ? 'text-rose-600 font-bold' : '',
              '[appearance:textfield]',
              '[&::-webkit-outer-spin-button]:appearance-none',
              '[&::-webkit-inner-spin-button]:appearance-none',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          />

          {/* Stacked chevron steppers */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => step_(step)}
              aria-label="Increase amount"
              className="flex items-center justify-center h-4 w-6 text-slate-400 hover:text-[#2563eb] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronUp size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => step_(-step)}
              aria-label="Decrease amount"
              className="flex items-center justify-center h-4 w-6 text-slate-400 hover:text-[#2563eb] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronDown size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-1 text-xs font-semibold text-rose-600 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AmountField.displayName = 'AmountField';
