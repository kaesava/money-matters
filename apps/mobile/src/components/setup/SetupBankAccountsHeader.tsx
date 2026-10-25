import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip } from '@money-matters/ui/mobile';

interface SetupBankAccountsHeaderProps {
  currentStep: number;
  totalSteps: number;
}

export function SetupBankAccountsHeader({ currentStep, totalSteps }: SetupBankAccountsHeaderProps) {
  return (
    <>
      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: currentStep, total: totalSteps })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('setup.bankAccountsStep.title')}</Text>
        <InfoTooltip title={t('setup.bankAccountsStep.title')} content={t('setup.bankAccountsStep.subtitle')} />
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipTitleRow}>
          <Text style={styles.tipTitle}>{t('setup.bankAccountsStep.tipTitle')}</Text>
          <InfoTooltip content={t('setup.bankAccountsStep.envelopesExplainerTooltip')} />
        </View>
        <Text style={styles.tipContent}>{t('setup.bankAccountsStep.tipContent')}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18, marginBottom: 16 },
  tipCard: { backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', padding: 14, marginBottom: 20, gap: 6 },
  tipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.accent },
  tipContent: { fontSize: 12, color: '#334155', lineHeight: 18 },
});
