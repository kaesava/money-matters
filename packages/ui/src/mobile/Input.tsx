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
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, required, error, hint, containerStyle, labelStyle, style, ...props }, ref) => {
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
          style={[styles.input, error ? styles.inputError : null, style]}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          {...props}
        />
        <FormFieldError error={error} />
      </View>
    );
  }
);

Input.displayName = 'Input';

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
    fontSize: 15,
    color: D.colors.textPrimary,
  },
  inputError: {
    borderColor: D.colors.critical,
  },
});

export default Input;
