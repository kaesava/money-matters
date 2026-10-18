"use client";

import React, { useId, useState, useCallback } from 'react';
import { FormLabel } from '../FormLabel';
import { FormFieldError } from '../FormFieldError';
import { formatAmountNumber, getCurrencyMinorUnits, getCurrencySymbol } from '../../lib/format';

export interface AmountFieldProps {
  /** Controlled string value — keep as empty string when blank */
  value: string;
  onChange: (value: string) => void;
  /** Called when the input loses focus — after formatting is applied */
  onBlur?: () => void;
  /** Called when the input gains focus */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  /** Allow negative values; renders -$X.XX in rose-600 */
  allowNegative?: boolean;
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
  /** Locale for comma and decimal formatting (default: 'en-AU') */
  locale?: string;
  /** Min value enforced on blur (default: 0 when allowNegative is false) */
  min?: number;
  /** Max value enforced on blur */
  max?: number;
}

function sanitiseRawAmount(
  raw: string,
  allowNegative: boolean,
  minorUnits: number,
  maxDigits: number
): string {
  let v = raw.replace(/,/g, '');
  if (!allowNegative) {
    v = v.replace(/-/g, '');
  }
  const negPrefix = allowNegative && v.startsWith('-') ? '-' : '';

  if (minorUnits === 0) {
    v = v.replace(/[^0-9]/g, '');
    if (v.length > maxDigits) v = v.slice(0, maxDigits);
    return negPrefix + v;
  }

  v = v.replace(/[^0-9.]/g, '');
  const parts = v.split('.');
  if (parts.length > 2) {
    v = parts[0] + '.' + parts.slice(1).join('');
  }
  if (parts[1] !== undefined) {
    v = parts[0] + '.' + parts[1].slice(0, minorUnits);
  }

  const integerPart = v.split('.')[0];
  if (integerPart.length > maxDigits) {
    v = integerPart.slice(0, maxDigits) + (v.includes('.') ? '.' + v.split('.')[1] : '');
  }
  return negPrefix + v;
}

/**
 * Canonical amount input for Serene Finance design tokens.
 * - Dynamic currency symbol with clearance.
 * - Auto-selects on focus/click.
 * - Comma grouping on blur adhering to country convention.
 * - Clean raw numeric input on focus.
 */
export const AmountField = React.forwardRef<HTMLInputElement, AmountFieldProps>(
  (
    {
      value,
      onChange,
      onBlur,
      onFocus,
      label,
      error,
      placeholder = '0.00',
      allowNegative = false,
      maxIntegerDigits = 10,
      currency = 'AUD',
      currencySymbol,
      minorUnits,
      locale = 'en-AU',
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
    const [isFocused, setIsFocused] = useState(false);
    const [localEditingText, setLocalEditingText] = useState<string | null>(null);

    const effectiveMinorUnits =
      minorUnits !== undefined ? minorUnits : getCurrencyMinorUnits(currency);
    const effectiveSymbol =
      currencySymbol ?? getCurrencySymbol(locale, currency);
    const effectiveMin = min !== undefined ? min : allowNegative ? undefined : 0;

    const sanitise = useCallback(
      (raw: string) => sanitiseRawAmount(raw, allowNegative, effectiveMinorUnits, maxIntegerDigits),
      [allowNegative, effectiveMinorUnits, maxIntegerDigits]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = sanitise(e.target.value);
      setLocalEditingText(cleaned);
      onChange(cleaned);
    };

    const handleBlur = () => {
      setIsFocused(false);
      setLocalEditingText(null);
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

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setLocalEditingText(value);
      onFocus?.(e);
      e.target.select();
    };

    const isNegative = allowNegative && parseFloat(value) < 0;
    const activeText = isFocused ? (localEditingText ?? value) : value;
    const displayValue = isFocused ? activeText : formatAmountNumber(activeText, locale, effectiveMinorUnits);

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <FormLabel htmlFor={inputId} required={required} className={labelClassName}>
            {label}
          </FormLabel>
        )}

        <div className="relative w-full">
          <span
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none font-medium ${
              isNegative ? 'text-rose-600 font-bold' : 'text-slate-400'
            }`}
          >
            {effectiveSymbol}
          </span>

          <input
            ref={ref}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={[
              'ui-input w-full !pl-10 !pr-3 text-sm font-mono tabular-nums h-[46px]',
              isNegative ? 'text-rose-600 font-bold' : '',
              '[appearance:textfield]',
              '[&::-webkit-outer-spin-button]:appearance-none',
              '[&::-webkit-inner-spin-button]:appearance-none',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          />
        </div>

        <FormFieldError error={error} />
      </div>
    );
  }
);

AmountField.displayName = 'AmountField';
