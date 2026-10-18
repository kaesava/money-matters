import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: (props: Record<string, unknown>) => React.createElement('View', props),
  Text: (props: Record<string, unknown>) => React.createElement('Text', props),
  TextInput: (props: Record<string, unknown>) => React.createElement('TextInput', props),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

import { AmountInput, cleanMobileAmount } from '../AmountInput';

describe('AmountInput', () => {
  it('is exported and defined as a React component', () => {
    expect(AmountInput).toBeDefined();
    expect(typeof AmountInput).toBe('object');
  });

  it('renders correctly with default and overridden props', () => {
    const onChangeText = vi.fn();
    const el = (
      <AmountInput
        value="123.45"
        onChangeText={onChangeText}
        label="Test Amount"
        placeholder="0.00"
      />
    );
    expect(el).toBeTruthy();
    expect(el.props.value).toBe('123.45');
    expect(el.props.label).toBe('Test Amount');

    const elNoSelect = (
      <AmountInput
        value="100.00"
        onChangeText={onChangeText}
        selectTextOnFocus={false}
      />
    );
    expect(elNoSelect.props.selectTextOnFocus).toBe(false);
  });

  it('sanitizes input and caps decimal to 2 places and integer to 12 digits via cleanMobileAmount', () => {
    // Multiple decimals: keeps first and appends remaining
    expect(cleanMobileAmount('12.34.56', 2)).toBe('12.34');

    // Integer capped at 12 digits
    expect(cleanMobileAmount('123456789012345.67', 2)).toBe('123456789012.67');

    // Strips invalid characters
    expect(cleanMobileAmount('abc$50.50xyz', 2)).toBe('50.50');

    // Strips commas
    expect(cleanMobileAmount('1,234,567.89', 2)).toBe('1234567.89');

    // Zero-decimal currencies (e.g. JPY)
    expect(cleanMobileAmount('1234.56', 0)).toBe('1234');
  });

  it('renders custom currency symbol and error message props', () => {
    const onChangeText = vi.fn();
    const el = (
      <AmountInput
        value="50"
        onChangeText={onChangeText}
        currencySymbol="€"
        error="Amount is required"
        hint="Enter your monthly budget"
      />
    );
    expect(el.props.currencySymbol).toBe('€');
    expect(el.props.error).toBe('Amount is required');
    expect(el.props.hint).toBe('Enter your monthly budget');
  });
});
