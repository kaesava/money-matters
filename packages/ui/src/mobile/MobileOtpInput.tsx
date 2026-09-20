import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface MobileOtpInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const MobileOtpInput = React.forwardRef<TextInput, MobileOtpInputProps>(
  (
    {
      value,
      onChangeText,
      label,
      required,
      error,
      hint,
      containerStyle,
      labelStyle,
      style,
      placeholder = '••••••',
      ...props
    },
    ref
  ) => {
    const handleChangeText = (text: string) => {
      const sanitized = text.replace(/\D/g, '').slice(0, 6);
      onChangeText(sanitized);
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <FormLabel required={required} style={labelStyle}>
            {label}
          </FormLabel>
        )}
        {hint && <Text style={styles.hint}>{hint}</Text>}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={6}
          placeholder={placeholder}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          style={[styles.input, error ? styles.inputError : null, style]}
          {...props}
        />
        <FormFieldError error={error} />
      </View>
    );
  }
);

MobileOtpInput.displayName = 'MobileOtpInput';

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: D.colors.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: D.colors.surface,
    borderWidth: 1,
    borderColor: D.colors.border,
    borderRadius: D.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '700',
    color: D.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputError: {
    borderColor: D.colors.critical,
    backgroundColor: '#FEF2F2',
  },
});

export default MobileOtpInput;
