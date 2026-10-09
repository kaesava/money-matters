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

import { AmountInput, AmountInputBase } from '../AmountInput';

describe('AmountInput', () => {
  it('renders with selectTextOnFocus set to true by default', () => {
    const onChangeText = vi.fn();
    const element = (
      <AmountInput
        value="123.45"
        onChangeText={onChangeText}
        label="Test Amount"
      />
    );
    expect(element).toBeTruthy();
    expect(element.props.value).toBe('123.45');
    // When rendered as AmountInput component, default prop or passed prop
    const tree = AmountInputBase(
      { value: '123.45', onChangeText, label: 'Test Amount' },
      null
    );
    // Find TextInput child
    const inputWrap = tree.props.children[2];
    const textInput = inputWrap.props.children[1];
    expect(textInput.props.selectTextOnFocus).toBe(true);
  });

  it('allows overriding selectTextOnFocus to false', () => {
    const onChangeText = vi.fn();
    const tree = AmountInputBase(
      {
        value: '100.00',
        onChangeText,
        selectTextOnFocus: false,
      },
      null
    );
    const inputWrap = tree.props.children[2];
    const textInput = inputWrap.props.children[1];
    expect(textInput.props.selectTextOnFocus).toBe(false);
  });

  it('sanitizes input and caps decimal to 2 places and integer to 12 digits', () => {
    const onChangeText = vi.fn();
    const tree = AmountInputBase(
      {
        value: '',
        onChangeText,
      },
      null
    );
    const inputWrap = tree.props.children[2];
    const textInput = inputWrap.props.children[1];

    // Simulate input with multiple decimals
    textInput.props.onChangeText('12.34.56');
    expect(onChangeText).toHaveBeenCalledWith('12.34');

    // Simulate input exceeding 12 integer digits
    textInput.props.onChangeText('123456789012345.67');
    expect(onChangeText).toHaveBeenCalledWith('123456789012.67');

    // Strips invalid characters
    textInput.props.onChangeText('abc$50.50xyz');
    expect(onChangeText).toHaveBeenCalledWith('50.50');
  });

  it('renders custom currency symbol and error message', () => {
    const onChangeText = vi.fn();
    const tree = AmountInputBase(
      {
        value: '50',
        onChangeText,
        currencySymbol: '€',
        error: 'Amount is required',
        hint: 'Enter your monthly budget',
      },
      null
    );
    const hint = tree.props.children[1];
    expect(hint.props.children).toBe('Enter your monthly budget');

    const inputWrap = tree.props.children[2];
    const symbol = inputWrap.props.children[0];
    expect(symbol.props.children).toBe('€');

    const error = tree.props.children[3];
    expect(error.props.error).toBe('Amount is required');
  });
});
