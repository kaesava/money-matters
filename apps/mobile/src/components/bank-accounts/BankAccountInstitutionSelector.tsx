import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FormLabel, BankProviderBadge, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  PROVIDERS,
  type SupportedBankProvider,
} from './bankAccountTypes';
import {
  ACCOUNT_TYPES,
  type AccountType,
  ACCOUNT_TYPE_LABELS,
} from '@money-matters/types';

interface BankAccountInstitutionSelectorProps {
  provider: SupportedBankProvider;
  setProvider: (p: SupportedBankProvider) => void;
  accountType: AccountType;
  setAccountType: (t: AccountType) => void;
}

export function BankAccountInstitutionSelector({
  provider,
  setProvider,
  accountType,
  setAccountType,
}: BankAccountInstitutionSelectorProps) {
  return (
    <>
      {/* 1. Bank Institution (Required Chips) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.bankAccountForm.bankProviderLabel')} required />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersRow}>
          {PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setProvider(p)}
              style={[styles.providerChip, provider === p && styles.providerChipActive]}
            >
              <BankProviderBadge provider={p} size="sm" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 2. Account Type (Required Chips) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.bankAccountForm.accountTypeLabel')} required />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersRow}>
          {ACCOUNT_TYPES.map((type) => {
            const isActive = accountType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setAccountType(type)}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    gap: 6,
  },
  providersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  providerChip: {
    padding: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  providerChipActive: {
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  typeChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  typeChipTextActive: {
    color: DESIGN_TOKENS.colors.onPrimary,
  },
});
