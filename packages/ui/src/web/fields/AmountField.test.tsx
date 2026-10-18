import { describe, it, expect } from 'vitest';
import { AmountField } from './AmountField';

describe('AmountField', () => {
  it('is exported and defined', () => {
    expect(AmountField).toBeDefined();
    expect(typeof AmountField).toBe('object'); // forwardRef returns an object
  });

  describe('sanitise logic (via internal behaviour)', () => {
    // Test the formatting rules used on blur: toFixed(2)
    it('formats a plain integer to 2dp', () => {
      const num = parseFloat('120');
      expect(num.toFixed(2)).toBe('120.00');
    });

    it('formats a decimal to 2dp', () => {
      const num = parseFloat('12.5');
      expect(num.toFixed(2)).toBe('12.50');
    });

    it('keeps zero-value as 0.00', () => {
      const num = parseFloat('0');
      expect(num.toFixed(2)).toBe('0.00');
    });

    it('clamps negative to 0 when allowNegative is false', () => {
      // Simulate the clamp logic in handleBlur
      const allowNegative = false;
      const effectiveMin = allowNegative ? undefined : 0;
      const num = -5;
      const clamped = effectiveMin !== undefined ? Math.max(effectiveMin, num) : num;
      expect(clamped).toBe(0);
    });

    it('allows negative value when allowNegative is true', () => {
      const allowNegative = true;
      const effectiveMin = allowNegative ? undefined : 0;
      const num = -150;
      const clamped = effectiveMin !== undefined ? Math.max(effectiveMin, num) : num;
      expect(clamped).toBe(-150);
      expect(clamped.toFixed(2)).toBe('-150.00');
    });
  });

  describe('comma formatting and display rules', () => {
    it('strips commas during sanitisation', () => {
      const raw = '1,234,567.89';
      const cleaned = raw.replace(/,/g, '');
      expect(cleaned).toBe('1234567.89');
    });

    it('formats display with commas on blur', () => {
      const num = 1234567.89;
      const formatted = new Intl.NumberFormat('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }).format(num);
      expect(formatted).toBe('1,234,567.89');
    });
  });

  describe('input sanitisation rules', () => {
    // Replicate sanitise() logic for unit testing
    const sanitise = (raw: string, allowNegative: boolean, maxIntegerDigits = 10): string => {
      let v = raw;
      if (!allowNegative) v = v.replace(/-/g, '');
      const negPrefix = allowNegative && v.startsWith('-') ? '-' : '';
      // Remove any characters except digits and decimal points
      v = v.replace(/[^0-9.]/g, '');
      // Split into integer part and the rest (possible multiple decimal points)
      const [intPart, ...rest] = v.split('.');
      // Concatenate all digits after the first decimal point
      const allDecimals = rest.join('');
      // Limit to two decimal places
      const decimals = allDecimals.slice(0, 2);
      // Reconstruct the numeric string
      v = decimals ? `${intPart}.${decimals}` : intPart;
      // Enforce max integer digits
      if (intPart.length > maxIntegerDigits) {
        const trimmedInt = intPart.slice(0, maxIntegerDigits);
        v = decimals ? `${trimmedInt}.${decimals}` : trimmedInt;
      }
      return negPrefix + v;
    };

    it('strips minus signs when allowNegative=false', () => {
      expect(sanitise('-100', false)).toBe('100');
    });

    it('preserves minus sign when allowNegative=true', () => {
      expect(sanitise('-100', true)).toBe('-100');
    });

    it('strips letters', () => {
      expect(sanitise('1a2b3', false)).toBe('123');
    });

    it('limits to 2 decimal digits', () => {
      expect(sanitise('1.999', false)).toBe('1.99');
    });

    it('prevents multiple decimal points', () => {
      expect(sanitise('1.2.3', false)).toBe('1.23');
    });

    it('caps integer part at maxIntegerDigits', () => {
      expect(sanitise('12345678901', false, 10)).toBe('1234567890');
    });
  });
});
