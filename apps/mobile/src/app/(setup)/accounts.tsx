import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm, FormErrorBanner } from '@money-matters/ui/mobile';
import { computeAccountAvailability } from '@money-matters/types';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import { SetupBankAccountsHeader } from '../../components/setup/SetupBankAccountsHeader';
import { SetupBankAccountCard } from '../../components/setup/SetupBankAccountCard';

export default function SetupBankAccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isRerun,
    totalSteps,
    bankAccounts,
    handleAddAccount,
    handleUpdateAccount,
    handleRemoveAccount,
  } = useSetupWizard();

  const handlePromptRemove = (id: string, name: string) => {
    showMobileConfirm({
      title: t('settings.bankAccountForm.archiveConfirmTitle'),
      message: t('settings.bankAccountForm.archiveConfirmBody', { name }),
      confirmText: t('common.delete'),
      isDestructive: true,
      onConfirm: () => handleRemoveAccount(id),
    });
  };

  const hasNegativeAvailable = bankAccounts.some(
    (acc) =>
      computeAccountAvailability(
        String(acc.lastKnownBalance || '0.00'),
        String(acc.unbudgetedBuffer || '0.00')
      ).available < 0
  );
  const hasSharedAccount = bankAccounts.some((acc) => !acc.isPrivate);
  const canProceed = !hasNegativeAvailable && hasSharedAccount;

  const handleNext = () => {
    if (!canProceed) return;
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

      <SetupBankAccountsHeader currentStep={2} totalSteps={totalSteps} />

      {hasNegativeAvailable && (
        <View style={styles.bannerWrap}>
          <FormErrorBanner message={t('setup.bankAccountsStep.negativeAvailableError')} />
        </View>
      )}
      {!hasNegativeAvailable && !hasSharedAccount && (
        <View style={styles.bannerWrap}>
          <FormErrorBanner message={t('setup.bankAccountsStep.noSharedAccountError')} />
        </View>
      )}

      <View style={styles.accountsList}>
        {bankAccounts.map((acc, index) => (
          <SetupBankAccountCard
            key={acc.id}
            acc={acc}
            index={index}
            totalCount={bankAccounts.length}
            onFieldChange={handleUpdateAccount}
            onRemove={handlePromptRemove}
          />
        ))}

        <TouchableOpacity onPress={handleAddAccount} style={styles.addAccountBtn}>
          <Text style={styles.addAccountBtnText}>+ {t('setup.bankAccountsStep.addAccount')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed}
          style={[styles.nextBtn, !canProceed && styles.disabledBtn]}
        >
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
  bannerWrap: { marginBottom: 16 },
  accountsList: { gap: 14, marginBottom: 24 },
  addAccountBtn: { paddingVertical: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, alignItems: 'center' },
  addAccountBtnText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
