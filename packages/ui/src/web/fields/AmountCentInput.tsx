'use client';

import React, { useState, useEffect } from 'react';

export interface AmountCentInputProps {
  label: string;
  value: number; // in cents
  onChange: (cents: number) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function AmountCentInput({
  label,
  value,
  onChange,
  required = false,
  className = '',
  placeholder = '0.00',
}: AmountCentInputProps) {
  // Store local string representation to allow decimals/typing
  const [displayValue, setDisplayValue] = useState<string>('');

  // Sync internal display value when external value changes
  useEffect(() => {
    const centsStr = (value / 100).toFixed(2);
    // Only overwrite local display value if numerical value differs
    if (parseFloat(displayValue) !== value / 100) {
      setDisplayValue(value > 0 ? centsStr : '');
    }
  }, [value]);

  const handleInputChange = (val: string) => {
    setDisplayValue(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * 100));
    } else {
      onChange(0);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <input
          type="text"
          inputMode="decimal"
          required={required}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="ui-input w-full pl-7 text-sm bg-white"
        />
      </div>
    </div>
  );
}
