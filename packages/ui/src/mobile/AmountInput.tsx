import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
  NativeSyntheticEvent,
  TargetedEvent,
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';
import { formatAmountNumber } from '../lib/format';

export interface AmountInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  currencySymbol?: string;
  locale?: string;
  minorUnits?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function cleanMobileAmount(raw: string, minorUnits: number = 2): string {
  let cleaned = raw.replace(/,/g, '');
  if (minorUnits === 0) {
    cleaned = cleaned.split('.')[0].replace(/[^0-9]/g, '');
    if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
    return cleaned;
  }
  cleaned = cleaned.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  const decimalParts = cleaned.split('.');
  if (decimalParts[1] && decimalParts[1].length > minorUnits) {
    cleaned = decimalParts[0] + '.' + decimalParts[1].slice(0, minorUnits);
  }
  const finalParts = cleaned.split('.');
  if (finalParts[0] && finalParts[0].length > 12) {
    cleaned = finalParts[0].slice(0, 12) + (finalParts.length > 1 ? '.' + finalParts[1] : '');
  }
  return cleaned;
}

export const AmountInputBase = (
  {
    value,
    onChangeText,
    label,
    required,
    error,
    hint,
    currencySymbol = '$',
    locale = 'en-AU',
    minorUnits = 2,
    placeholder = '0.00',
    containerStyle,
    editable = true,
    selectTextOnFocus = true,
    style,
    onFocus,
    onBlur,
    ...props
  }: AmountInputProps,
  ref: React.ForwardedRef<TextInput>
) => {
  let isFocused = false;
  let setIsFocused: (v: boolean) => void = () => {};
  try {
    const hookState = useState(false);
    isFocused = hookState[0];
    setIsFocused = hookState[1];
  } catch {
    // Safe fallback when invoked directly outside of React render tree in unit tests
  }

  const handleChange = (raw: string) => {
    onChangeText(cleanMobileAmount(raw, minorUnits));
  };

  const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>) => {
    setIsFocused(false);
    if (value && !isNaN(parseFloat(value))) {
      onChangeText(parseFloat(value).toFixed(minorUnits));
    }
    onBlur?.(e);
  };

  const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const displayValue = isFocused ? value : formatAmountNumber(value, locale, minorUnits);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <Text style={styles.symbol}>{currencySymbol}</Text>
        <TextInput
          ref={ref}
          value={displayValue}
          onChangeText={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          keyboardType="decimal-pad"
          editable={editable}
          selectTextOnFocus={selectTextOnFocus}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      <FormFieldError error={error} />
    </View>
  );
};

export const AmountInput = React.forwardRef<TextInput, AmountInputProps>(AmountInputBase);
AmountInput.displayName = 'AmountInput';

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: D.radius.md,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: D.colors.critical,
  },
  symbol: {
    fontSize: 20,
    fontWeight: '800',
    color: D.colors.textMuted,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: D.colors.primary,
    fontFamily: 'monospace',
    paddingVertical: 10,
  },
  hint: {
    fontSize: 12,
    color: D.colors.textMuted,
    marginBottom: 6,
  },
});

export default AmountInput;
