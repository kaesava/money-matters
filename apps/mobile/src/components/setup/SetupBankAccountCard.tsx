import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip, AmountInput } from '@money-matters/ui/mobile';
import {
  BANK_PROVIDERS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  BANK_PROVIDER_LABELS,
  computeAccountAvailability,
} from '@money-matters/types';
import { MobileBankAccountItem } from '../../context/setup-wizard-types';

interface SetupBankAccountCardProps {
  acc: MobileBankAccountItem;
  index: number;
  totalCount: number;
  onFieldChange: (
    acc: MobileBankAccountItem,
    field: 'name' | 'bankProvider' | 'accountType' | 'lastKnownBalance' | 'unbudgetedBuffer' | 'isPrivate',
    value: string | boolean
  ) => void;
  onRemove: (id: string, name: string) => void;
}

export function SetupBankAccountCard({
  acc,
  index,
  totalCount,
  onFieldChange,
  onRemove,
}: SetupBankAccountCardProps) {
  const { actualBalance, buffer, available } = computeAccountAvailability(
    String(acc.lastKnownBalance || '0.00'),
    String(acc.unbudgetedBuffer || '0.00')
  );
  const isBufferInvalid = buffer > actualBalance;

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountCardHeader}>
        <Text style={styles.accountIndexLabel}>
          {t('setup.bankAccountsStep.accountNumber', { number: index + 1 })}
        </Text>
        {totalCount > 1 && (
          <TouchableOpacity onPress={() => onRemove(acc.id, acc.name)}>
            <Text style={styles.removeText}>{t('common.remove')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.bankProviderLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {BANK_PROVIDERS.map((bp) => {
            const isSelected = (acc.bankProvider || 'Other') === bp;
            return (
              <TouchableOpacity
                key={bp}
                onPress={() => onFieldChange(acc, 'bankProvider', bp)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {BANK_PROVIDER_LABELS[bp]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.accountTypeLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {ACCOUNT_TYPES.map((at) => {
            const isSelected = (acc.accountType || 'EVERYDAY') === at;
            return (
              <TouchableOpacity
                key={at}
                onPress={() => onFieldChange(acc, 'accountType', at)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {ACCOUNT_TYPE_LABELS[at]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.accountNameLabel')}</Text>
        <TextInput
          value={acc.name}
          onChangeText={(val) => onFieldChange(acc, 'name', val)}
          placeholder="e.g. ANZ Bank (Savings)"
          style={styles.textInput}
        />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.flexOne}>
          <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.balanceLabel')}</Text>
          <AmountInput
            value={String(acc.lastKnownBalance || '0.00')}
            onChangeText={(val) => onFieldChange(acc, 'lastKnownBalance', val)}
          />
        </View>
        <View style={styles.flexOne}>
          <View style={styles.labelWithTooltip}>
            <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.bufferLabel')}</Text>
            <InfoTooltip content={t('setup.bankAccountsStep.reservedFundsTooltip')} />
          </View>
          <AmountInput
            value={String(acc.unbudgetedBuffer || '0.00')}
            onChangeText={(val) => onFieldChange(acc, 'unbudgetedBuffer', val)}
          />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.availableBox}>
          <Text style={styles.availableLabel}>{t('bankAccounts.availableLabel')}:</Text>
          <Text style={[styles.availableAmount, isBufferInvalid && styles.textError]}>
            ${available.toFixed(2)}
          </Text>
        </View>

        <View style={styles.privacyRow}>
          <Text style={styles.privacyLabel}>{t('settings.bankAccountForm.privacyLabel')}</Text>
          <InfoTooltip content={t('settings.bankAccountForm.privacyHint')} />
          <Switch
            value={Boolean(acc.isPrivate)}
            onValueChange={(val) => onFieldChange(acc, 'isPrivate', val)}
            trackColor={{ false: '#E2E8F0', true: DESIGN_TOKENS.colors.sereneBlue }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accountCard: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], padding: 14, gap: 12 },
  accountCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountIndexLabel: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  removeText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.critical },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[500] },
  chipsRow: { gap: 6, paddingVertical: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.sereneBlue, borderColor: DESIGN_TOKENS.colors.sereneBlue },
  chipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  textInput: { height: 40, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, fontSize: 13, fontWeight: '600', backgroundColor: '#FFFFFF', color: '#1E293B' },
  amountsRow: { flexDirection: 'row', gap: 12 },
  flexOne: { flex: 1 },
  labelWithTooltip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  availableBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  availableLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },
  availableAmount: { fontSize: 12, fontWeight: '800', color: DESIGN_TOKENS.colors.successDark },
  textError: { color: DESIGN_TOKENS.colors.critical },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privacyLabel: { fontSize: 11, fontWeight: '700', color: '#334155' },
});
