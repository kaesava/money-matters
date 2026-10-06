import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface SplitPoolReasoningFieldProps {
  isZeroAllocation: boolean;
  reasoningValue: string;
  isReadOnly: boolean;
  onChangeText: (val: string) => void;
}

export const SplitPoolReasoningField: React.FC<SplitPoolReasoningFieldProps> = ({
  isZeroAllocation,
  reasoningValue,
  isReadOnly,
  onChangeText,
}) => {
  return (
    <View style={styles.reasoningRow}>
      <Text style={styles.reasoningLabel}>
        {t('paydayDrawer.reasoningLabel')}
      </Text>
      <TextInput
        style={[
          styles.reasoningInput,
          isZeroAllocation && styles.reasoningInputDisabled,
        ]}
        value={isZeroAllocation ? '' : reasoningValue}
        editable={!isReadOnly && !isZeroAllocation}
        placeholder={isZeroAllocation ? '' : t('paydayDrawer.reasoningPlaceholder')}
        placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  reasoningRow: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 8,
    gap: 4,
  },
  reasoningLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  reasoningInput: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.primary,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reasoningInputDisabled: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
