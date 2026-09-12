import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { formatAUD } from '../../lib/format';

export default function AffordCheckScreen() {
  const router = useRouter();
  const D = DESIGN_TOKENS;

  const [rawAmount, setRawAmount] = useState('');
  const [mode, setMode] = useState<'ONE_OFF' | 'RECURRING'>('ONE_OFF');
  const [frequency, setFrequency] = useState<
    'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'
  >('MONTHLY');
  const [itemName, setItemName] = useState('');
  const [includePersonal, setIncludePersonal] = useState(false);

  const parsedAmount = parseFloat(rawAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading } = trpc.canAfford.useQuery(
    {
      amount: rawAmount,
      mode,
      frequency,
      itemName: itemName.trim() || undefined,
      includePersonal,
    },
    {
      enabled: isValidAmount,
    }
  );

  const handleAmountChange = (text: string) => {
    if (text === '' || /^\d{0,12}(\.\d{0,2})?$/.test(text)) {
      setRawAmount(text);
    }
  };

  return (
    <MobileScreenWrapper title={t('canIAfford.title') || 'Can I Afford It?'}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Navigation */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={16} color="#64748B" />
          <Text style={styles.backText}>
            {t('canIAfford.backToDashboard') || 'Back'}
          </Text>
        </TouchableOpacity>

        {/* Subtitle description */}
        <Text style={styles.subtitle}>
          {t('canIAfford.horizonNote') ||
            'Instant simulation against your available Everyday balance and ring-fenced bills.'}
        </Text>

        {/* Mode Selector Pill */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            onPress={() => setMode('ONE_OFF')}
            style={[
              styles.modePill,
              mode === 'ONE_OFF' && styles.modePillActive,
            ]}
          >
            <Feather
              name="shopping-bag"
              size={14}
              color={mode === 'ONE_OFF' ? '#1B2B4B' : '#64748B'}
            />
            <Text
              style={[
                styles.modeText,
                mode === 'ONE_OFF' && styles.modeTextActive,
              ]}
            >
              {t('canIAfford.modeOneOff') || 'One-Off'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('RECURRING')}
            style={[
              styles.modePill,
              mode === 'RECURRING' && styles.modePillActive,
            ]}
          >
            <Feather
              name="repeat"
              size={14}
              color={mode === 'RECURRING' ? '#1B2B4B' : '#64748B'}
            />
            <Text
              style={[
                styles.modeText,
                mode === 'RECURRING' && styles.modeTextActive,
              ]}
            >
              {t('canIAfford.modeRecurring') || 'Recurring'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Frequency Picker for Recurring */}
        {mode === 'RECURRING' && (
          <View style={styles.freqRow}>
            {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const).map(
              (f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFrequency(f)}
                  style={[
                    styles.freqChip,
                    frequency === f && styles.freqChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.freqText,
                      frequency === f && styles.freqTextActive,
                    ]}
                  >
                    {f === 'WEEKLY'
                      ? 'Wk'
                      : f === 'FORTNIGHTLY'
                      ? 'Fortnight'
                      : f === 'MONTHLY'
                      ? 'Month'
                      : 'Year'}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* Item Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {t('canIAfford.itemNameLabel') || 'What are you buying? (Optional)'}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={
              mode === 'ONE_OFF' ? 'e.g. New Headphones' : 'e.g. Netflix, Gym'
            }
            value={itemName}
            onChangeText={setItemName}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {t('canIAfford.amountLabel') || 'Amount ($)'}
          </Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={rawAmount}
              onChangeText={handleAmountChange}
              placeholderTextColor="#94A3B8"
              autoFocus
            />
          </View>
        </View>

        {/* Include Personal / Private switch */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Include Private Allowances</Text>
            <Text style={styles.switchSubtext}>
              Simulate against personal allowances in addition to shared pools.
            </Text>
          </View>
          <Switch
            value={includePersonal}
            onValueChange={setIncludePersonal}
            trackColor={{ false: '#E2E8F0', true: '#2563eb' }}
          />
        </View>

        {/* Result Verdict Section */}
        {isLoading && isValidAmount ? (
          <ActivityIndicator color="#2563eb" style={{ marginVertical: 30 }} />
        ) : data ? (
          <View style={styles.resultSection}>
            {/* Verdict Box */}
            <View
              style={[
                styles.verdictBox,
                data.verdict === 'SAFE_YES'
                  ? styles.verdictGreen
                  : data.verdict === 'HARD_NO'
                  ? styles.verdictRed
                  : styles.verdictAmber,
              ]}
            >
              <Text style={styles.verdictTitle}>
                {data.verdict === 'SAFE_YES' && '🟢 Yes, Safe to Buy'}
                {data.verdict === 'PACING_TIGHT' && '🟡 Yes, but Tight Pacing'}
                {data.verdict === 'BILLS_RISK' && '⚠️ Risk: Bills Buffer Consumed'}
                {data.verdict === 'WAIT_FOR_PAYCYCLE' && '🔵 Wait for Next Payday'}
                {data.verdict === 'GOAL_DELAYED' && '🟠 Delays Savings Target'}
                {data.verdict === 'HARD_NO' && '🔴 No, Insufficient Funds'}
              </Text>

              {data.rationaleSteps && data.rationaleSteps.length > 0 && (
                <View style={styles.rationaleList}>
                  {data.rationaleSteps.map((step, idx) => (
                    <Text key={idx} style={styles.rationaleStep}>
                      • {step}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Breakdown Card */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownHeader}>Financial Details</Text>

              {('availableCash' in data) && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Available Cash</Text>
                  <Text style={styles.breakdownVal}>
                    {formatAUD(data.availableCash)}
                  </Text>
                </View>
              )}

              {('everydayRemaining' in data) && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Everyday Remaining</Text>
                  <Text style={styles.breakdownVal}>
                    {formatAUD(data.everydayRemaining)}
                  </Text>
                </View>
              )}

              {('safeCushion' in data) && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Safe Buffer</Text>
                  <Text style={styles.breakdownVal}>
                    {formatAUD(data.safeCushion)}
                  </Text>
                </View>
              )}

              {('upcomingBillsBeforePayday' in data) && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Upcoming Ring-fenced Bills</Text>
                  <Text style={styles.breakdownVal}>
                    {formatAUD(data.upcomingBillsBeforePayday)}
                  </Text>
                </View>
              )}

              {('shortfallToday' in data) && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Shortfall Today</Text>
                  <Text style={styles.breakdownValNegative}>
                    -{formatAUD(data.shortfallToday)}
                  </Text>
                </View>
              )}

              {('shortfall' in data) && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Estimated Shortfall</Text>
                  <Text style={styles.breakdownValNegative}>
                    -{formatAUD(data.shortfall)}
                  </Text>
                </View>
              )}
            </View>

            {/* Goal Delay Alert */}
            {data.verdict === 'GOAL_DELAYED' && data.goalDelays && data.goalDelays.length > 0 && (
              <View style={styles.goalDelayCard}>
                <Feather name="alert-triangle" size={16} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalDelayTitle}>Goal Impact</Text>
                  <Text style={styles.goalDelayText}>
                    This commitment delays {data.goalDelays.map(g => `${g.goalName} (+${g.delayDays}d)`).join(', ')}.
                  </Text>
                </View>
              </View>
            )}

            {/* Goal Alternative Alert */}
            {data.verdict === 'WAIT_FOR_PAYCYCLE' && data.goalAlternative && (
              <View style={styles.goalDelayCard}>
                <Feather name="target" size={16} color="#2563eb" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalDelayTitle}>Goal Alternative Available</Text>
                  <Text style={styles.goalDelayText}>
                    You could borrow {formatAUD(data.goalAlternative.shortfallCovered)} from {data.goalAlternative.goalName} (delays goal by {data.goalAlternative.delayDays} days).
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modePillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTextActive: {
    color: '#1B2B4B',
    fontWeight: '800',
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  freqTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1B2B4B',
    backgroundColor: '#FFFFFF',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '900',
    color: '#64748B',
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  switchSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  resultSection: {
    gap: 14,
    marginTop: 8,
  },
  verdictBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  verdictGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  verdictRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  verdictAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 8,
  },
  rationaleList: {
    gap: 4,
  },
  rationaleStep: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  breakdownValNegative: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#ba1a1a',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  breakdownTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#22c55e',
  },
  negativeVal: {
    color: '#ba1a1a',
  },
  goalDelayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
  },
  goalDelayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  goalDelayText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
});
