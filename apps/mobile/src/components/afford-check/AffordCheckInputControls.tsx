import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface AffordCheckInputControlsProps {
  mode: 'ONE_OFF' | 'RECURRING';
  setMode: (m: 'ONE_OFF' | 'RECURRING') => void;
  frequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
  setFrequency: (f: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') => void;
  itemName: string;
  setItemName: (val: string) => void;
  rawAmount: string;
  onAmountChange: (val: string) => void;
  includePersonal: boolean;
  setIncludePersonal: (val: boolean) => void;
}

export function AffordCheckInputControls({
  mode,
  setMode,
  frequency,
  setFrequency,
  itemName,
  setItemName,
  rawAmount,
  onAmountChange,
  includePersonal,
  setIncludePersonal,
}: AffordCheckInputControlsProps) {
  return (
    <>
      <Text style={styles.subtitle}>{t('canIAfford.horizonNote')}</Text>

      <View style={styles.modeSelector}>
        <TouchableOpacity
          onPress={() => setMode('ONE_OFF')}
          style={[styles.modePill, mode === 'ONE_OFF' && styles.modePillActive]}
        >
          <Feather
            name="shopping-bag"
            size={14}
            color={mode === 'ONE_OFF' ? DESIGN_TOKENS.colors.primary : DESIGN_TOKENS.colors.slate[500]}
          />
          <Text style={[styles.modeText, mode === 'ONE_OFF' && styles.modeTextActive]}>
            {t('canIAfford.modeOneOff')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('RECURRING')}
          style={[styles.modePill, mode === 'RECURRING' && styles.modePillActive]}
        >
          <Feather
            name="repeat"
            size={14}
            color={mode === 'RECURRING' ? DESIGN_TOKENS.colors.primary : DESIGN_TOKENS.colors.slate[500]}
          />
          <Text style={[styles.modeText, mode === 'RECURRING' && styles.modeTextActive]}>
            {t('canIAfford.modeRecurring')}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'RECURRING' && (
        <View style={styles.freqRow}>
          {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFrequency(f)}
              style={[styles.freqChip, frequency === f && styles.freqChipActive]}
            >
              <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>
                {f === 'WEEKLY'
                  ? t('canIAfford.freqChips.weekly')
                  : f === 'FORTNIGHTLY'
                  ? t('canIAfford.freqChips.fortnightly')
                  : f === 'MONTHLY'
                  ? t('canIAfford.freqChips.monthly')
                  : t('canIAfford.freqChips.annually')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('canIAfford.itemNameLabel')}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={mode === 'ONE_OFF' ? 'e.g. New Headphones' : 'e.g. Netflix, Gym'}
          value={itemName}
          onChangeText={setItemName}
          placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('canIAfford.amountLabel')}</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={rawAmount}
            onChangeText={onAmountChange}
            placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
            autoFocus
          />
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.flex1}>
          <Text style={styles.switchLabel}>{t('canIAfford.includePersonal')}</Text>
          <Text style={styles.switchSubtext}>
            {t('canIAfford.includePersonalSubtext')}
          </Text>
        </View>
        <Switch
          value={includePersonal}
          onValueChange={setIncludePersonal}
          trackColor={{ false: DESIGN_TOKENS.colors.slate[200], true: DESIGN_TOKENS.colors.sereneBlue }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.slate[500], lineHeight: 18 },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
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
    backgroundColor: DESIGN_TOKENS.colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: { fontSize: 13, fontWeight: '600', color: DESIGN_TOKENS.colors.slate[500] },
  modeTextActive: { color: DESIGN_TOKENS.colors.primary, fontWeight: '800' },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  freqChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  freqText: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.slate[500] },
  freqTextActive: { color: DESIGN_TOKENS.colors.sereneBlue, fontWeight: '800' },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  textInput: {
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary,
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  currencySymbol: { fontSize: 24, fontWeight: '900', color: DESIGN_TOKENS.colors.slate[500], marginRight: 12 },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  switchLabel: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  switchSubtext: { fontSize: 11, color: DESIGN_TOKENS.colors.slate[400], marginTop: 2 },
});
