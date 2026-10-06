import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export const ReconcileNudgeCard: React.FC = () => {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/(app)/settings/bank-accounts' as never)}
      style={styles.card}
    >
      <Feather name="refresh-cw" size={16} color={DESIGN_TOKENS.colors.warningDark} />
      <View style={styles.content}>
        <Text style={styles.title}>{t('bankAccounts.reconcileNudgeTitle')}</Text>
        <Text style={styles.desc}>{t('bankAccounts.reconcileNudgeDesc')}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={DESIGN_TOKENS.colors.warningDark} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    padding: 12,
    gap: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  desc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.warningDark,
    marginTop: 2,
  },
});
