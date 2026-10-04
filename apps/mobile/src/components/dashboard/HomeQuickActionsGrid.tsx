import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { QuickActionType } from '../QuickExpenseModal';

interface HomeQuickActionsGridProps {
  onOpenQuickModal: (type: QuickActionType) => void;
}

export function HomeQuickActionsGrid({ onOpenQuickModal }: HomeQuickActionsGridProps) {
  const router = useRouter();

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>
        {t('dashboard.quickActions.title')}
      </Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onOpenQuickModal('DEBIT')}
        >
          <Feather name="minus-circle" size={20} color={DESIGN_TOKENS.colors.burnRed} />
          <Text style={styles.actionCardText}>
            {t('dashboard.quickActions.addExpense')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onOpenQuickModal('CREDIT')}
        >
          <Feather name="plus-circle" size={20} color={DESIGN_TOKENS.colors.success} />
          <Text style={styles.actionCardText}>
            {t('dashboard.recordIncome')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onOpenQuickModal('TRANSFER')}
        >
          <Feather name="repeat" size={20} color={DESIGN_TOKENS.colors.sereneBlue} />
          <Text style={styles.actionCardText}>
            {t('dashboard.quickActions.moveMoney')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(app)/categories')}
        >
          <Feather name="grid" size={20} color={DESIGN_TOKENS.colors.primary} />
          <Text style={styles.actionCardText}>{t('nav.myMoney')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
});
