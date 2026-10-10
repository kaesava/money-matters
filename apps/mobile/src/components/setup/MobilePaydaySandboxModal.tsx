import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog, AmountInput, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

interface MobilePaydaySandboxModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
  estimatedBills?: number;
  estimatedGoals?: number;
  defaultPaycheck?: number;
}

export function MobilePaydaySandboxModal({
  visible,
  onClose,
  onFinish,
  estimatedBills = 850,
  estimatedGoals = 400,
  defaultPaycheck = 2500,
}: MobilePaydaySandboxModalProps) {
  const [paycheckStr, setPaycheckStr] = useState(String(defaultPaycheck));
  const [isSimulated, setIsSimulated] = useState(false);

  const parsedPaycheck = parseFloat(paycheckStr) || 0;
  const billsAllocated = Math.min(parsedPaycheck, estimatedBills > 0 ? estimatedBills : 850);
  const goalsAllocated = Math.min(
    Math.max(0, parsedPaycheck - billsAllocated),
    estimatedGoals > 0 ? estimatedGoals : 400
  );
  const safeToSpend = Math.max(0, parsedPaycheck - billsAllocated - goalsAllocated);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('setup.sandbox.title')}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
              onPress={() => setIsSimulated(true)}
              disabled={parsedPaycheck <= 0}
            >
              ✨ {t('setup.sandbox.runSimulateCta')}
            </MobileButton>
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
                <Text style={styles.metricVal}>{formatAUD(billsAllocated)}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('paydayDrawer.fundedGoals')}</Text>
                <Text style={styles.metricVal}>{formatAUD(goalsAllocated)}</Text>
              </View>

              <View style={[styles.metricCard, styles.safeCard]}>
                <Text style={styles.safeLabel}>{t('paydayDrawer.safeToSpend')}</Text>
                <Text style={styles.safeVal}>{formatAUD(safeToSpend)}</Text>
              </View>
            </View>

            <MobileButton
              variant="primary"
              onPress={onFinish}
              style={styles.finishBtn}
            >
              {t('setup.sandbox.gotItCta')} →
            </MobileButton>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  results: {
    gap: 14,
  },
  successBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  safeCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
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
    color: '#16A34A',
    textAlign: 'center',
  },
  safeVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803D',
    fontFamily: 'monospace',
  },
  finishBtn: {
    backgroundColor: DESIGN_TOKENS.colors.success,
  },
});
