import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { CanAffordVerdictType } from '@money-matters/types';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../lib/format';

export interface CanAffordCardProps {
  canAffordAmount: string;
  setCanAffordAmount: (amt: string) => void;
  canAffordData?: CanAffordVerdictType | null;
}

export function CanAffordCard({
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
}: CanAffordCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("dashboard.quickActions.canAffordTitle")}</Text>
      <TextInput
        keyboardType="decimal-pad"
        placeholder={t("dashboard.quickActions.enterAmountPlaceholder")}
        value={canAffordAmount}
        onChangeText={setCanAffordAmount}
        style={styles.input}
        placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
      />

      {canAffordData && (
        <View
          style={[
            styles.verdictBox,
            canAffordData.verdict === 'SAFE_YES'
              ? styles.yesBox
              : canAffordData.verdict === 'PACING_WARNING'
              ? styles.impactBox
              : canAffordData.verdict === 'IMPACT_GOALS'
              ? styles.impactBox
              : canAffordData.verdict === 'WAIT_FOR_PAYDAY'
              ? styles.impactBox
              : styles.noBox,
          ]}
        >
          <Text style={styles.verdictTitle}>
            {canAffordData.verdict === 'SAFE_YES' && '🟢 Yes, Safe to Buy'}
            {canAffordData.verdict === 'PACING_WARNING' && '🟡 Yes, but Tight Daily Pacing'}
            {canAffordData.verdict === 'IMPACT_GOALS' && '🟠 Yes, Dips into Savings'}
            {canAffordData.verdict === 'WAIT_FOR_PAYDAY' && '🔵 Wait for Payday'}
            {canAffordData.verdict === 'HARD_NO' && '🔴 No, Do Not Buy'}
          </Text>

          <View style={{ marginTop: 6, gap: 3 }}>
            {canAffordData.rationaleSteps.map((step, idx) => (
              <Text key={idx} style={styles.rationaleText}>
                • {step}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    height: 40,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textPrimary,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  verdictBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  yesBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  impactBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  noBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  verdictTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  rationaleText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
  },
});

