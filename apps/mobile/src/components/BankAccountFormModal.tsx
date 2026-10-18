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
  MobileInput,
  MobileButton,
  FormErrorBanner,
  showMobileConfirm,
  InfoTooltip,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { AccountBalanceCard } from './bank-accounts/AccountBalanceCard';
import {
  type BankAccountItemToEdit,
  type SupportedBankProvider,
} from './bank-accounts/bankAccountTypes';
import { useBankAccountForm } from './bank-accounts/useBankAccountForm';
import { BankAccountInstitutionSelector } from './bank-accounts/BankAccountInstitutionSelector';

export type { BankAccountItemToEdit, SupportedBankProvider };

interface BankAccountFormModalProps {
  visible: boolean;
  accountToEdit?: BankAccountItemToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
  onNeedsReconciliation?: (account: BankAccountItemToEdit) => void;
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

        <BankAccountInstitutionSelector
          provider={provider}
          setProvider={setProvider}
          accountType={accountType}
          setAccountType={setAccountType}
        />

        {/* Account Name (Required) */}
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

        {/* Balances & Buffer */}
        <AccountBalanceCard
          balance={balance}
          buffer={buffer}
          availableToBudget={availableToBudget}
          isNegativeAvailable={isNegativeAvailable}
          onBalanceChange={setBalance}
          onBufferChange={setBuffer}
        />

        {/* Privacy Toggle with Single Tooltip */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.switchLabel}>{t('settings.bankAccountForm.privacyLabel')}</Text>
            <InfoTooltip content={t('settings.bankAccountForm.privacyHint')} />
          </View>
          <Switch
            value={isPrivate}
            onValueChange={handleTogglePrivate}
            disabled={isEdit}
            trackColor={{ false: DESIGN_TOKENS.colors.border, true: DESIGN_TOKENS.colors.sereneBlue }}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
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
