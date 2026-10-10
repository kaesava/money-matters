import React, { useState, useDeferredValue } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog, AmountInput } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { AffordCheckVerdictCard } from './AffordCheckVerdictCard';
import { AffordCheckBreakdownCard } from './AffordCheckBreakdownCard';

interface MobileAffordCheckModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MobileAffordCheckModal({ visible, onClose }: MobileAffordCheckModalProps) {
  const [rawAmount, setRawAmount] = useState('');
  const [mode, setMode] = useState<'ONE_OFF' | 'RECURRING'>('ONE_OFF');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'>('MONTHLY');

  const deferredAmount = useDeferredValue(rawAmount);
  const parsedAmount = parseFloat(deferredAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading } = trpc.canAfford.useQuery(
    {
      amount: deferredAmount,
      mode,
      frequency,
      includePersonal: false,
    },
    {
      enabled: isValidAmount,
    }
  );

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('canIAfford.title')}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === 'ONE_OFF' && styles.tabBtnActive]}
            onPress={() => setMode('ONE_OFF')}
            activeOpacity={0.8}
          >
            <Feather
              name="shopping-bag"
              size={14}
              color={mode === 'ONE_OFF' ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.slate[500]}
            />
            <Text style={[styles.tabBtnText, mode === 'ONE_OFF' && styles.tabBtnTextActive]}>
              {t('canIAfford.modeOneOff')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, mode === 'RECURRING' && styles.tabBtnActive]}
            onPress={() => setMode('RECURRING')}
            activeOpacity={0.8}
          >
            <Feather
              name="repeat"
              size={14}
              color={mode === 'RECURRING' ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.slate[500]}
            />
            <Text style={[styles.tabBtnText, mode === 'RECURRING' && styles.tabBtnTextActive]}>
              {t('canIAfford.modeRecurring')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={styles.inputCard}>
          <AmountInput
            label={mode === 'ONE_OFF' ? t('canIAfford.purchaseAmount') : t('canIAfford.recurringAmount')}
            value={rawAmount}
            onChangeText={setRawAmount}
            required
            autoFocus
          />

          {mode === 'RECURRING' && (
            <View style={styles.freqContainer}>
              <Text style={styles.freqLabel}>{t('canIAfford.frequencyLabel')}</Text>
              <View style={styles.freqGrid}>
                {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setFrequency(freq)}
                    style={[styles.freqChip, frequency === freq && styles.freqChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.freqChipText, frequency === freq && styles.freqChipTextActive]}>
                      {t(`recurrence.frequencies.${freq.toLowerCase()}` as Parameters<typeof t>[0])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Verdict Result */}
        {isValidAmount && (
          <View style={styles.results}>
            {isLoading && (
              <ActivityIndicator color={DESIGN_TOKENS.colors.sereneBlue} style={{ padding: 16 }} />
            )}
            {data && (
              <View style={{ gap: 12 }}>
                <AffordCheckVerdictCard
                  verdict={data.verdict}
                  rationaleSteps={data.rationaleSteps}
                  canAffordAt={'canAffordAt' in data ? (data.canAffordAt as string) : null}
                />
                <AffordCheckBreakdownCard data={data} />
              </View>
            )}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  tabBtnTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  inputCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  freqContainer: {
    gap: 6,
  },
  freqLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  freqGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  freqChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  freqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  freqChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  freqChipTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  results: {
    gap: 12,
  },
});
