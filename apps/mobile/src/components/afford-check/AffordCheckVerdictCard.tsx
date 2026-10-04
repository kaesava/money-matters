import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface AffordCheckVerdictCardProps {
  verdict: string;
  rationaleSteps?: string[];
}

export function AffordCheckVerdictCard({
  verdict,
  rationaleSteps,
}: AffordCheckVerdictCardProps) {
  return (
    <View
      style={[
        styles.verdictBox,
        verdict === 'SAFE_YES'
          ? styles.verdictGreen
          : verdict === 'HARD_NO'
          ? styles.verdictRed
          : styles.verdictAmber,
      ]}
    >
      <Text style={styles.verdictTitle}>
        {verdict === 'SAFE_YES' && t('canIAfford.verdictSafeYes')}
        {verdict === 'PACING_TIGHT' && t('canIAfford.verdictPacingTight')}
        {verdict === 'BILLS_RISK' && t('canIAfford.verdictBillsRisk')}
        {verdict === 'WAIT_FOR_PAYCYCLE' && t('canIAfford.verdictWaitForPaycycle')}
        {verdict === 'GOAL_DELAYED' && t('canIAfford.verdictGoalDelayed')}
        {verdict === 'HARD_NO' && t('canIAfford.verdictHardNo')}
      </Text>

      {rationaleSteps && rationaleSteps.length > 0 && (
        <View style={styles.rationaleList}>
          {rationaleSteps.map((step, idx) => (
            <Text key={idx} style={styles.rationaleStep}>
              • {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  verdictBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  verdictGreen: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  verdictRed: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  verdictAmber: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 8,
  },
  rationaleList: {
    gap: 4,
  },
  rationaleStep: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 16,
  },
});
