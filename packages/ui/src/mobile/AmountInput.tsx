import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface AmountInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  currencySymbol?: string;
  containerStyle?: StyleProp<ViewStyle>;
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
    placeholder = '0.00',
    containerStyle,
    editable = true,
    selectTextOnFocus = true,
    style,
    ...props
  }: AmountInputProps,
  ref: React.ForwardedRef<TextInput>
) => {
    const handleChange = (raw: string) => {
      // Defensively keep only numbers and a single decimal point
      let cleaned = raw.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      const decimalParts = cleaned.split('.');
      if (decimalParts[1] && decimalParts[1].length > 2) {
        cleaned = decimalParts[0] + '.' + decimalParts[1].slice(0, 2);
      }
      // Cap integer part at 12 digits
      const finalParts = cleaned.split('.');
      if (finalParts[0] && finalParts[0].length > 12) {
        cleaned = finalParts[0].slice(0, 12) + (finalParts.length > 1 ? '.' + finalParts[1] : '');
      }
      onChangeText(cleaned);
    };

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && <FormLabel required={required}>{label}</FormLabel>}
        {hint && <Text style={styles.hint}>{hint}</Text>}
        <View style={[styles.inputWrap, error ? styles.inputError : null]}>
          <Text style={styles.symbol}>{currencySymbol}</Text>
          <TextInput
            ref={ref}
            value={value}
            onChangeText={handleChange}
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
