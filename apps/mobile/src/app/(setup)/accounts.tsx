import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  InfoTooltip,
  AmountInput,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import {
  BANK_PROVIDERS,
  ACCOUNT_TYPES,
  BankProvider,
  AccountType,
  ACCOUNT_TYPE_LABELS,
  BANK_PROVIDER_LABELS,
  getDefaultAccountName,
  computeAccountAvailability,
} from '@money-matters/types';

export default function SetupBankAccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { isRerun, totalSteps } = useSetupWizard();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const accounts = bankAccountsQuery.data ?? [];

  const createAccountMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      toast.success(t('common.success'));
    },
    onError: (err) => {
      toast.error(err.message || t('common.error'));
    },
  });

  const updateAccountMut = trpc.updateBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || t('common.error'));
    },
  });

  const archiveAccountMut = trpc.archiveBankAccount.useMutation({
    onSuccess: () => {
      utils.getBankAccountsWithMappings.invalidate();
      toast.success(t('common.success'));
    },
    onError: (err) => {
      toast.error(err.message || t('common.error'));
    },
  });

  const handleFieldChange = (
    acc: (typeof accounts)[number],
    field: 'name' | 'bankProvider' | 'accountType' | 'lastKnownBalance' | 'unbudgetedBuffer' | 'isPrivate',
    value: string | boolean
  ) => {
    let nextName = acc.name;
    const currentProvider = (acc.bankProvider || 'Other') as BankProvider;
    const currentType = ((acc.accountType as AccountType) || 'EVERYDAY') as AccountType;
    const oldDefaultName = getDefaultAccountName(currentProvider, currentType);
    const isUntouched = !acc.name.trim() || acc.name.trim() === oldDefaultName;

    if (field === 'bankProvider') {
      const nextProvider = value as BankProvider;
      if (isUntouched) {
        nextName = getDefaultAccountName(nextProvider, currentType);
      }
    } else if (field === 'accountType') {
      const nextType = value as AccountType;
      if (isUntouched) {
        nextName = getDefaultAccountName(currentProvider, nextType);
      }
    } else if (field === 'name') {
      nextName = value as string;
    }

    updateAccountMut.mutate({
      accountId: acc.id,
      data: {
        name: nextName,
        bankProvider: field === 'bankProvider' ? (value as BankProvider) : currentProvider,
        accountType: field === 'accountType' ? (value as AccountType) : currentType,
        lastKnownBalance: field === 'lastKnownBalance' ? String(value) : String(acc.lastKnownBalance || '0.00'),
        unbudgetedBuffer: field === 'unbudgetedBuffer' ? String(value) : String(acc.unbudgetedBuffer || '0.00'),
        isPrivate: field === 'isPrivate' ? Boolean(value) : Boolean(acc.isPrivate),
      },
    });
  };

  const handleAddAccount = () => {
    createAccountMut.mutate({
      name: '',
      bankProvider: 'Other',
      accountType: 'EVERYDAY',
      lastKnownBalance: '1000.00',
      unbudgetedBuffer: '0.00',
      isPrivate: false,
    });
  };

  const handleRemoveAccount = (id: string, name: string) => {
    showMobileConfirm({
      title: t('settings.bankAccountForm.archiveConfirmTitle'),
      message: t('settings.bankAccountForm.archiveConfirmBody', { name }),
      confirmText: t('common.delete'),
      isDestructive: true,
      onConfirm: () => archiveAccountMut.mutate({ accountId: id }),
    });
  };

  const handleNext = () => {
    if (isRerun) {
      router.push({ pathname: '/(setup)/categories', params: { mode: 'rerun' } });
    } else {
      router.push('/(setup)/goals');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 20), paddingBottom: Math.max(insets.bottom + 20, 20) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <SetupProgressBar currentStep={2} totalSteps={totalSteps} isRerun={isRerun} />

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 2, total: totalSteps })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('setup.bankAccountsStep.title')}</Text>
        <InfoTooltip title={t('setup.bankAccountsStep.tooltipTitle')} content={t('setup.bankAccountsStep.tooltip')} />
      </View>
      <Text style={styles.subtitle}>{t('setup.bankAccountsStep.subtitle')}</Text>

      {/* Serene Finance Tip Card */}
      <View style={styles.tipCard}>
        <View style={styles.tipTitleRow}>
          <Text style={styles.tipTitle}>💡 {t('setup.bankAccountsStep.tipTitle')}</Text>
          <InfoTooltip content={t('setup.bankAccountsStep.envelopesExplainerTooltip')} />
        </View>
        <Text style={styles.tipContent}>{t('setup.bankAccountsStep.tipContent')}</Text>
      </View>

      {/* Inline Editable Accounts List */}
      <View style={styles.accountsList}>
        {accounts.map((acc, index) => {
          const { actualBalance, buffer, available } = computeAccountAvailability(
            String(acc.lastKnownBalance || '0.00'),
            String(acc.unbudgetedBuffer || '0.00')
          );
          const isBufferInvalid = buffer > actualBalance;

          return (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accountCardHeader}>
                <Text style={styles.accountIndexLabel}>
                  {t('setup.bankAccountsStep.accountNumber', { number: index + 1 })}
                </Text>
                {accounts.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveAccount(acc.id, acc.name)}>
                    <Text style={styles.removeText}>{t('common.remove')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Institution Chips */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.bankProviderLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {BANK_PROVIDERS.map((bp) => {
                    const isSelected = (acc.bankProvider || 'Other') === bp;
                    return (
                      <TouchableOpacity
                        key={bp}
                        onPress={() => handleFieldChange(acc, 'bankProvider', bp)}
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

              {/* Account Type Chips */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.accountTypeLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {ACCOUNT_TYPES.map((at) => {
                    const isSelected = (acc.accountType || 'EVERYDAY') === at;
                    return (
                      <TouchableOpacity
                        key={at}
                        onPress={() => handleFieldChange(acc, 'accountType', at)}
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

              {/* Account Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.accountNameLabel')}</Text>
                <TextInput
                  value={acc.name}
                  onChangeText={(val) => handleFieldChange(acc, 'name', val)}
                  placeholder="e.g. ANZ Bank (Savings)"
                  style={styles.textInput}
                />
              </View>

              {/* Balances */}
              <View style={styles.amountsRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.balanceLabel')}</Text>
                  <AmountInput
                    value={String(acc.lastKnownBalance || '0.00')}
                    onChangeText={(val) => handleFieldChange(acc, 'lastKnownBalance', val)}
                  />
                </View>
                <View style={styles.flexOne}>
                  <View style={styles.labelWithTooltip}>
                    <Text style={styles.fieldLabel}>{t('settings.bankAccountForm.bufferLabel')}</Text>
                    <InfoTooltip content={t('setup.bankAccountsStep.reservedFundsTooltip')} />
                  </View>
                  <AmountInput
                    value={String(acc.unbudgetedBuffer || '0.00')}
                    onChangeText={(val) => handleFieldChange(acc, 'unbudgetedBuffer', val)}
                  />
                </View>
              </View>

              {/* Available & Privacy */}
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
                    onValueChange={(val) => handleFieldChange(acc, 'isPrivate', val)}
                    trackColor={{ false: '#E2E8F0', true: DESIGN_TOKENS.colors.sereneBlue }}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* Add Bank Account CTA */}
        <TouchableOpacity
          onPress={handleAddAccount}
          disabled={createAccountMut.isPending}
          style={styles.addAccountBtn}
        >
          <Text style={styles.addAccountBtnText}>+ {t('setup.bankAccountsStep.addAccount')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>
            {isRerun ? t('common.next') : t('setup.bankAccountsStep.nextGoals')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: DESIGN_TOKENS.colors.background, flexGrow: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18, marginBottom: 16 },
  tipCard: { backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', padding: 14, marginBottom: 20, gap: 6 },
  tipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.accent },
  tipContent: { fontSize: 12, color: '#334155', lineHeight: 18 },
  accountsList: { gap: 14, marginBottom: 24 },
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
  addAccountBtn: { paddingVertical: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, alignItems: 'center' },
  addAccountBtnText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
