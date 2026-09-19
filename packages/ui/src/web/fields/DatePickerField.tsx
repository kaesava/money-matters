'use client';

import React, { useId, useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { FormLabel } from '../FormLabel';
import { FormFieldError } from '../FormFieldError';
import { fmtDate } from '../../utils/formatDate';
import { useDateLocale } from '../../hooks/DateLocaleContext';

export interface DatePickerFieldProps {
  label?: string;
  value?: string; // ISO YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  id?: string;
  locale?: string;
  timeZone?: string;
  formatDate?: (iso: string) => string;
  placeholder?: string;
}

function getDefaultPlaceholder(loc: string): string {
  if (loc.startsWith('ja')) return 'YYYY/MM/DD';
  if (loc.startsWith('en-CA')) return 'YYYY-MM-DD';
  if (loc.startsWith('en-US')) return 'MM/DD/YYYY';
  return 'DD/MM/YYYY';
}

function parseInputDate(text: string, loc: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Direct ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return trimmed;
  }

  // 2. YYYY/M/D (Japanese)
  if (loc.startsWith('ja') || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[/.-]/).map(Number);
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  // 3. DD/MM/YYYY (Australian / British)
  if (!loc.startsWith('en-US') && /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[/.-]/).map(Number);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  // 4. MM/DD/YYYY (US)
  if (loc.startsWith('en-US') && /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[/.-]/).map(Number);
    if (parts.length === 3) {
      const [m, d, y] = parts;
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

export function DatePickerField({
  label,
  value = '',
  onChange,
  required = false,
  className = '',
  min,
  max,
  disabled = false,
  error,
  hint,
  id,
  locale: propLocale,
  timeZone: propTimeZone,
  formatDate: propFormatDate,
  placeholder,
}: DatePickerFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const ctx = useDateLocale();
  const effectiveLocale = propLocale || ctx.locale || 'en-AU';
  const effectiveTimeZone = propTimeZone || ctx.timeZone || 'Australia/Sydney';

  const nativeInputRef = useRef<HTMLInputElement>(null);

  const formatDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    if (propFormatDate) return propFormatDate(isoStr);
    return fmtDate(isoStr, effectiveTimeZone, effectiveLocale);
  };

  const [displayText, setDisplayText] = useState(() => formatDisplay(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayText(formatDisplay(value));
    }
  }, [value, effectiveLocale, effectiveTimeZone, isFocused]);

  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      if (nativeInputRef.current && 'showPicker' in nativeInputRef.current) {
        nativeInputRef.current.showPicker();
        return;
      }
    } catch {
      // Fallback
    }
    nativeInputRef.current?.focus();
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    onChange(nextVal);
    setDisplayText(formatDisplay(nextVal));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayText(raw);
    const parsed = parseInputDate(raw, effectiveLocale);
    if (parsed !== null) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // If text field is empty, clear value
    if (!displayText.trim()) {
      onChange('');
      setDisplayText('');
      return;
    }
    // Attempt parse
    const parsed = parseInputDate(displayText, effectiveLocale);
    if (parsed) {
      onChange(parsed);
      setDisplayText(formatDisplay(parsed));
    } else {
      // Revert to current valid value formatting
      setDisplayText(formatDisplay(value));
    }
  };

  const effectivePlaceholder = placeholder || getDefaultPlaceholder(effectiveLocale);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      {hint && <p className="text-xs text-slate-500 mb-1.5 font-medium">{hint}</p>}

      <div className="relative flex items-center">
        {/* Visible Text Input with Formatted Date Display */}
        <input
          id={inputId}
          type="text"
          value={displayText}
          placeholder={effectivePlaceholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={handleTextChange}
          className={`ui-input w-full pr-10 text-sm bg-white font-mono tracking-tight disabled:opacity-50 ${
            error ? 'border-red-400 focus:ring-red-400' : ''
          }`}
        />

        {/* Hidden Native Date Input for Calendar Picker */}
        <input
          ref={nativeInputRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={handleNativeChange}
          className="sr-only"
        />

        {/* Calendar Trigger Button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={handleOpenPicker}
          aria-label="Open calendar date picker"
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      <FormFieldError error={error} />
    </div>
  );
}
