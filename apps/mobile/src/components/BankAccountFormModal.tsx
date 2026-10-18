import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  BankProviderBadge,
  MobileInput,
  MobileButton,
  FormLabel,
  FormErrorBanner,
  InfoTooltip,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { AccountBalanceCard } from './bank-accounts/AccountBalanceCard';
import {
  BankAccountItemToEdit,
  SupportedBankProvider,
  PROVIDERS,
} from './bank-accounts/bankAccountTypes';
import {
  ACCOUNT_TYPES,
  AccountType,
  ACCOUNT_TYPE_LABELS,
} from '@money-matters/types';
import { useBankAccountForm } from './bank-accounts/useBankAccountForm';

export type { BankAccountItemToEdit, SupportedBankProvider };

interface BankAccountFormModalProps {
  visible: boolean;
  accountToEdit?: BankAccountItemToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
  onNeedsReconciliation?: (account: any) => void;
}

export function BankAccountFormModal({
  visible,
  accountToEdit,
  onClose,
  onSuccess,
  onNeedsReconciliation,
}: BankAccountFormModalProps) {
  const {
    isEdit,
    isDirty,
    name,
    setName,
    provider,
    setProvider,
    accountType,
    setAccountType,
    balance,
    setBalance,
    buffer,
    setBuffer,
    isPrivate,
    setIsPrivate,
    submitting,
    nameError,
    setNameError,
    generalError,
    availableToBudget,
    isNegativeAvailable,
    handleArchive,
    handleSubmit,
  } = useBankAccountForm(visible, accountToEdit, onClose, onSuccess, onNeedsReconciliation);

  const handleTogglePrivate = (targetVal: boolean) => {
    showMobileConfirm({
      title: t('bankAccounts.privacyWarningTitle'),
      message: targetVal
        ? t('bankAccounts.privacyWarningMakePrivate')
        : t('bankAccounts.privacyWarningMakeShared'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      isDestructive: false,
      onConfirm: () => setIsPrivate(targetVal),
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t('settings.bankAccountForm.editTitle') : t('settings.bankAccounts.addAccount')}
      subtitle={t('tooltips.bankAccounts.content')}
      footer={
        <View style={styles.footerContainer}>
          {isEdit && (
            <TouchableOpacity onPress={handleArchive} style={styles.archiveLink}>
              <Text style={styles.archiveLinkText}>{t('common.archive')}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.footerButtons}>
            <MobileButton variant="ghost" onPress={onClose} style={styles.actionBtn}>
              {t('common.cancel')}
            </MobileButton>
            <MobileButton
              variant="primary"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!name.trim() || isNegativeAvailable}
              style={styles.actionBtn}
            >
              {isEdit ? t('common.saveChanges') : t('settings.bankAccounts.addAccount')}
            </MobileButton>
          </View>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        <FormErrorBanner message={generalError} />

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

        {/* 3. Account Name (Required) */}
        <MobileInput
          label={t('settings.bankAccountForm.accountNameLabel')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError('');
          }}
          placeholder={t('settings.bankAccountForm.accountNamePlaceholder')}
          error={nameError}
          autoFocus={!isEdit}
        />

        {/* 4. Balances & Buffer */}
        <AccountBalanceCard
          balance={balance}
          buffer={buffer}
          availableToBudget={availableToBudget}
          isNegativeAvailable={isNegativeAvailable}
          onBalanceChange={setBalance}
          onBufferChange={setBuffer}
        />

        {/* 5. Privacy Toggle with Single Tooltip */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.switchLabel}>{t('settings.bankAccountForm.privacyLabel')}</Text>
            <InfoTooltip content={t('settings.bankAccountForm.privacyHint')} />
          </View>
          <Switch
            value={isPrivate}
            onValueChange={handleTogglePrivate}
            disabled={isEdit}
            trackColor={{ false: '#E2E8F0', true: DESIGN_TOKENS.colors.sereneBlue }}
          />
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 8,
  },
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  archiveLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  archiveLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.critical,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  actionBtn: {
    minWidth: 90,
  },
});
