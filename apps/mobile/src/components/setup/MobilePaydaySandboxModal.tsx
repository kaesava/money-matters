import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog, AmountInput, MobileButton } from '@money-matters/ui/mobile';
import {
  EstimatedCategoryItem,
  IncomeItem,
  UserGoalItem,
  simulateSetupPaydaySandbox,
} from '@money-matters/types';
import { t } from '@money-matters/i18n';
import { formatMobileCurrency } from '../../lib/format';
import { MobileBankAccountItem } from '../../context/setup-wizard-types';

interface MobilePaydaySandboxModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish?: () => void;
  incomes: IncomeItem[];
  bankAccounts: MobileBankAccountItem[];
  activeEveryday: EstimatedCategoryItem[];
  activeRegular: EstimatedCategoryItem[];
  activeGoals: EstimatedCategoryItem[];
  goals: UserGoalItem[];
}

export function MobilePaydaySandboxModal({
  visible,
  onClose,
  onFinish,
  incomes,
  bankAccounts,
  activeEveryday,
  activeRegular,
  activeGoals,
  goals,
}: MobilePaydaySandboxModalProps) {
  const defaultPaycheck = incomes[0]?.amount ?? 0;
  const [paycheckStr, setPaycheckStr] = useState(String(defaultPaycheck));
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    if (visible) {
      setPaycheckStr(String(incomes[0]?.amount ?? 0));
      setIsSimulated(false);
    }
  }, [visible, incomes]);

  const parsedPaycheck = parseFloat(paycheckStr) || 0;

  const simResult = useMemo(
    () =>
      simulateSetupPaydaySandbox({
        paycheckAmount: parsedPaycheck,
        incomes,
        bankAccounts,
        activeEveryday,
        activeRegular,
        activeGoals,
        goals,
      }),
    [parsedPaycheck, incomes, bankAccounts, activeEveryday, activeRegular, activeGoals, goals]
  );

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('setup.sandbox.title')}
    >
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          {t('setup.sandbox.subtitle')}
        </Text>

        <View style={styles.inputCard}>
          <AmountInput
            label={t('setup.sandbox.paycheckAmount')}
            value={paycheckStr}
            onChangeText={(val) => {
              setPaycheckStr(val);
              setIsSimulated(false);
            }}
            required
            autoFocus
          />

          {!isSimulated && (
            <MobileButton
              variant="primary"
              label={`✨ ${t('setup.sandbox.runSimulateCta')}`}
              onPress={() => setIsSimulated(true)}
              disabled={parsedPaycheck <= 0}
            />
          )}
        </View>

        {isSimulated && (
          <View style={styles.results}>
            <View style={styles.successBanner}>
              <Text style={styles.successText}>
                {t('setup.sandbox.simulatedSuccess')}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('paydayDrawer.ringFencedBills')}</Text>
                <Text style={styles.metricVal}>{formatMobileCurrency(simResult.billsAllocated)}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('paydayDrawer.fundedGoals')}</Text>
                <Text style={styles.metricVal}>{formatMobileCurrency(simResult.goalsAllocated)}</Text>
              </View>

              <View style={[styles.metricCard, styles.safeCard]}>
                <Text style={styles.safeLabel}>{t('paydayDrawer.safeToSpend')}</Text>
                <Text style={styles.safeVal}>{formatMobileCurrency(simResult.safeToSpend)}</Text>
              </View>
            </View>

            <MobileButton
              variant="secondary"
              label={t('setup.sandbox.returnToReview')}
              onPress={onFinish ?? onClose}
              style={styles.finishBtn}
            />
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 12,
  },
  results: {
    gap: 14,
  },
  successBanner: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderRadius: 10,
    padding: 10,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  safeCard: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
    textAlign: 'center',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    fontFamily: 'monospace',
  },
  safeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
    textAlign: 'center',
  },
  safeVal: {
    fontSize: 12,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.successDark,
    fontFamily: 'monospace',
  },
  finishBtn: {
    backgroundColor: DESIGN_TOKENS.colors.success,
  },
});
