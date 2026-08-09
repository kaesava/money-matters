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
            canAffordData.verdict === 'YES'
              ? styles.yesBox
              : canAffordData.verdict === 'YES_WITH_IMPACT'
              ? styles.impactBox
              : styles.noBox,
          ]}
        >
          <Text
            style={[
              styles.verdictText,
              canAffordData.verdict === 'YES'
                ? styles.yesText
                : canAffordData.verdict === 'YES_WITH_IMPACT'
                ? styles.impactText
                : styles.noText,
            ]}
          >
            {canAffordData.verdict === 'YES' && `YES! Available in Everyday (${formatAUD(canAffordData.everydayRemaining)} remaining)`}
            {canAffordData.verdict === 'YES_WITH_IMPACT' && `YES WITH IMPACT: Dips into ${canAffordData.affectedBucketName}`}
            {canAffordData.verdict === 'WAIT' && `WAIT: Paycheck due in ${canAffordData.daysUntilNextPaycheck} days`}
            {canAffordData.verdict === 'NO' && `NO: Shortfall of ${formatAUD(canAffordData.shortfall)}`}
          </Text>
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
  },
  impactBox: {
    backgroundColor: '#FFFBEB',
  },
  noBox: {
    backgroundColor: '#FEF2F2',
  },
  verdictText: {
    fontSize: 12,
    fontWeight: '700',
  },
  yesText: {
    color: '#166534',
  },
  impactText: {
    color: '#92400E',
  },
  noText: {
    color: '#991B1B',
  },
});
