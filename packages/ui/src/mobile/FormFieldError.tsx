import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';

export interface FormFieldErrorProps {
  error?: string | null;
  style?: StyleProp<TextStyle>;
}

export function FormFieldError({ error, style }: FormFieldErrorProps) {
  if (!error) return null;

  return (
    <Text style={[styles.errorText, style]}>
      {error}
    </Text>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  errorText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: D.colors.critical,
  },
});

export default FormFieldError;
