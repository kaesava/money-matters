import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';

interface AussieBankCheatSheetModalProps {
  visible: boolean;
  onClose: () => void;
}

const BANKS = [
  {
    nameKey: 'setup.bankAccountsStep.cheatSheetCba',
    badge: 'CBA',
    badgeBg: '#F59E0B',
    badgeTextColor: '#0F172A',
    stepsKey: 'setup.bankAccountsStep.cheatSheetCbaSteps',
  },
  {
    nameKey: 'setup.bankAccountsStep.cheatSheetUp',
    badge: 'UP',
    badgeBg: '#F97316',
    badgeTextColor: '#FFFFFF',
    stepsKey: 'setup.bankAccountsStep.cheatSheetUpSteps',
  },
  {
    nameKey: 'setup.bankAccountsStep.cheatSheetMacquarie',
    badge: 'MQ',
    badgeBg: '#0F172A',
    badgeTextColor: '#FFFFFF',
    stepsKey: 'setup.bankAccountsStep.cheatSheetMacquarieSteps',
  },
  {
    nameKey: 'setup.bankAccountsStep.cheatSheetIng',
    badge: 'ING',
    badgeBg: '#EA580C',
    badgeTextColor: '#FFFFFF',
    stepsKey: 'setup.bankAccountsStep.cheatSheetIngSteps',
  },
  {
    nameKey: 'setup.bankAccountsStep.cheatSheetOther',
    badge: 'BIG 4',
    badgeBg: '#2563EB',
    badgeTextColor: '#FFFFFF',
    stepsKey: 'setup.bankAccountsStep.cheatSheetOtherSteps',
  },
];

export function AussieBankCheatSheetModal({ visible, onClose }: AussieBankCheatSheetModalProps) {
  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('setup.bankAccountsStep.cheatSheetTitle')}
      subtitle={t('setup.bankAccountsStep.cheatSheetSubtitle')}
      footer={
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
          <Text style={styles.closeBtnText}>{t('setup.bankAccountsStep.cheatSheetClose')}</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView style={styles.scroll}>
        {BANKS.map((b) => (
          <View key={b.nameKey} style={styles.section}>
            <View style={[styles.badge, { backgroundColor: b.badgeBg }]}>
              <Text style={[styles.badgeText, { color: b.badgeTextColor }]}>{b.badge}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.bankName}>{t(b.nameKey)}</Text>
              <Text style={styles.steps}>{t(b.stepsKey)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 380 },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  info: { flex: 1 },
  bankName: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 2 },
  steps: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 16 },
  closeBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 12,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: 'center',
    width: '100%',
  },
  closeBtnText: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '700', fontSize: 14 },
});
