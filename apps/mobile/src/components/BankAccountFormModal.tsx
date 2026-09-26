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
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { PoolLinkSelector } from './bank-accounts/PoolLinkSelector';
import { AccountBalanceCard } from './bank-accounts/AccountBalanceCard';
import {
  BankAccountItemToEdit,
  SupportedBankProvider,
  PROVIDERS,
} from './bank-accounts/bankAccountTypes';
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
    name,
    setName,
    provider,
    setProvider,
    balance,
    setBalance,
    buffer,
    setBuffer,
    isPrivate,
    setIsPrivate,
    selectedPoolIds,
    submitting,
    nameError,
    setNameError,
    generalError,
    allPools,
    linkedPools,
    availableToBudget,
    isNegativeAvailable,
    linkedPoolsTotal,
    hasVariance,
    diffBeforeSave,
    handleArchive,
    handleTogglePool,
    handleSubmit,
  } = useBankAccountForm(visible, accountToEdit, onClose, onSuccess, onNeedsReconciliation);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={isEdit ? t('modals.bankAccountForm.titleEdit') : t('settings.bankAccounts.addAccount')}
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

        <MobileInput
          label={t('common.name')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError('');
          }}
          placeholder="e.g. CBA Smart Access"
          error={nameError}
          autoFocus={!isEdit}
        />

        <View style={styles.inputGroup}>
          <FormLabel>{t('bankAccounts.title')}</FormLabel>
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

        <AccountBalanceCard
          balance={balance}
          buffer={buffer}
          availableToBudget={availableToBudget}
          isNegativeAvailable={isNegativeAvailable}
          linkedPoolsTotal={linkedPoolsTotal}
          hasVariance={hasVariance}
          diffBeforeSave={diffBeforeSave}
          linkedPoolsCount={linkedPools.length}
          onBalanceChange={setBalance}
          onBufferChange={setBuffer}
        />

        {!isEdit && (
          <PoolLinkSelector
            pools={allPools}
            selectedPoolIds={selectedPoolIds}
            onTogglePool={handleTogglePool}
          />
        )}

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>{t('bankAccounts.privatePersonalAccount')}</Text>
            <Text style={styles.switchSubtext}>{t('categories.privatePoolTooltip')}</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  archiveLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  archiveLinkText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    minWidth: 90,
  },
});
