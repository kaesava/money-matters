import React from 'react';
import { View, Text, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';

export interface FormLabelProps {
  required?: boolean;
  children?: React.ReactNode;
  label?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function FormLabel({ required, children, label, style, containerStyle }: FormLabelProps) {
  const content = children ?? (typeof label === 'string' ? label : label);
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, style]}>
        {content}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: D.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  asterisk: {
    color: D.colors.critical,
    fontWeight: '700',
  },
});

export default FormLabel;
