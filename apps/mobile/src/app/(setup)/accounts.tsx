import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { AussieBankCheatSheetModal } from '../../components/AussieBankCheatSheetModal';
import { BankAccountFormModal } from '../../components/BankAccountFormModal';
import { SetupArchetypeCard } from '../../components/setup/SetupArchetypeCard';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';

export default function SetupBankAccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRerun, totalSteps } = useSetupWizard();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const createAccountMut = trpc.createBankAccount.useMutation();
  const updateAccountMut = trpc.updateBankAccount.useMutation();

  const accounts = bankAccountsQuery.data ?? [];
  const [selectedArchetype, setSelectedArchetype] = useState<string>(
    accounts.length >= 2 ? 'AUSSIE_2_ACCOUNT' : 'ALL_IN_ONE_CUSTOM'
  );
  const [isApplying, setIsApplying] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const applyArchetype = async (type: 'AUSSIE_2_ACCOUNT' | 'COUPLES_HYBRID' | 'ALL_IN_ONE_CUSTOM') => {
    setSelectedArchetype(type);
    setIsApplying(true);
    try {
      if (type === 'AUSSIE_2_ACCOUNT' && accounts.length === 1 && accounts[0]) {
        await updateAccountMut.mutateAsync({
          accountId: accounts[0].id,
          data: { name: 'Everyday Spending Card', bankProvider: (accounts[0].bankProvider as 'CBA') || 'CBA' },
        });
        await createAccountMut.mutateAsync({
          name: 'Bills & Savings Account',
          bankProvider: 'CBA',
          lastKnownBalance: '1000.00',
          unbudgetedBuffer: '0.00',
          isPrivate: false,
        });
      } else if (type === 'COUPLES_HYBRID' && accounts.length < 3) {
        if (accounts[0]) {
          await updateAccountMut.mutateAsync({
            accountId: accounts[0].id,
            data: { name: 'Joint Bills & Rent', bankProvider: (accounts[0].bankProvider as 'CBA') || 'CBA' },
          });
        }
        await createAccountMut.mutateAsync({
          name: 'Joint Everyday Spending',
          bankProvider: 'CBA',
          lastKnownBalance: '500.00',
          unbudgetedBuffer: '0.00',
          isPrivate: false,
        });
        await createAccountMut.mutateAsync({
          name: 'My Private Spending',
          bankProvider: 'Other',
          lastKnownBalance: '200.00',
          unbudgetedBuffer: '0.00',
          isPrivate: true,
        });
      } else if (type === 'ALL_IN_ONE_CUSTOM' && accounts.length === 1 && accounts[0]) {
        await updateAccountMut.mutateAsync({
          accountId: accounts[0].id,
          data: { name: 'Primary Account', bankProvider: (accounts[0].bankProvider as 'CBA') || 'CBA' },
        });
      }
      await bankAccountsQuery.refetch();
    } catch {
      // Handled silently
    } finally {
      setIsApplying(false);
    }
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setup.bankAccountsStep.archetypeTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('setup.bankAccountsStep.archetypeSubtitle')}</Text>
      </View>

      <SetupArchetypeCard
        emoji="🇦🇺"
        badge={t('setup.bankAccountsStep.archetype2AccountBadge')}
        badgeBg={DESIGN_TOKENS.colors.successLight}
        badgeColor={DESIGN_TOKENS.colors.successDark}
        title={t('setup.bankAccountsStep.archetype2AccountTitle')}
        description={t('setup.bankAccountsStep.archetype2AccountDesc')}
        isSelected={selectedArchetype === 'AUSSIE_2_ACCOUNT'}
        onPress={() => applyArchetype('AUSSIE_2_ACCOUNT')}
      />

      <SetupArchetypeCard
        emoji="👥"
        badge={t('setup.bankAccountsStep.archetypeCouplesBadge')}
        badgeBg={DESIGN_TOKENS.colors.accentLight}
        badgeColor={DESIGN_TOKENS.colors.accentDark}
        title={t('setup.bankAccountsStep.archetypeCouplesTitle')}
        description={t('setup.bankAccountsStep.archetypeCouplesDesc')}
        isSelected={selectedArchetype === 'COUPLES_HYBRID'}
        onPress={() => applyArchetype('COUPLES_HYBRID')}
      />

      <SetupArchetypeCard
        emoji="📱"
        badge={t('setup.bankAccountsStep.archetype1AccountBadge')}
        badgeBg={DESIGN_TOKENS.colors.slate[100]}
        badgeColor={DESIGN_TOKENS.colors.slate[600]}
        title={t('setup.bankAccountsStep.archetype1AccountTitle')}
        description={t('setup.bankAccountsStep.archetype1AccountDesc')}
        isSelected={selectedArchetype === 'ALL_IN_ONE_CUSTOM'}
        onPress={() => applyArchetype('ALL_IN_ONE_CUSTOM')}
      />

      <TouchableOpacity activeOpacity={0.8} onPress={() => setShowCheatSheet(true)} style={styles.cheatSheetBanner}>
        <Text style={styles.cheatSheetBannerText}>{t('setup.bankAccountsStep.cheatSheetLink')}</Text>
      </TouchableOpacity>

      <View style={styles.accountsBox}>
        <View style={styles.accountsHeader}>
          <Text style={styles.accountsBoxTitle}>{t('nav.bankAccounts')} ({accounts.length})</Text>
          <TouchableOpacity onPress={() => setShowAddAccountModal(true)}>
            <Text style={styles.addAccountLink}>+ {t('setup.bankAccountsStep.addAccount')}</Text>
          </TouchableOpacity>
        </View>
        {accounts.map((acc) => (
          <View key={acc.id} style={styles.accountRow}>
            <View style={styles.flexOne}>
              <Text style={styles.accountName}>{acc.name}</Text>
              <Text style={styles.accountBalance}>
                {t('setup.bankAccountsStep.balance')}: ${parseFloat(acc.lastKnownBalance || '0').toFixed(2)}
              </Text>
            </View>
            <View style={styles.badgeNeutral}>
              <Text style={styles.badgeTextNeutral}>{acc.bankProvider || 'Bank'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextBtn} disabled={isApplying}>
          {isApplying ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>
              {isRerun ? t('common.next') : t('setup.bankAccountsStep.nextGoals')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <AussieBankCheatSheetModal visible={showCheatSheet} onClose={() => setShowCheatSheet(false)} />
      <BankAccountFormModal
        visible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onSuccess={() => {
          setShowAddAccountModal(false);
          bankAccountsQuery.refetch();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: DESIGN_TOKENS.colors.background, flexGrow: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18, marginBottom: 20 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  sectionSubtitle: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  badgeNeutral: { backgroundColor: DESIGN_TOKENS.colors.slate[100], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTextNeutral: { fontSize: 10, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  cheatSheetBanner: { backgroundColor: DESIGN_TOKENS.colors.successLight, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.successBorder, borderRadius: 12, padding: 12, marginVertical: 12 },
  cheatSheetBannerText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.successDark, textAlign: 'center' },
  accountsBox: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], padding: 14, marginBottom: 20 },
  accountsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  accountsBoxTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  addAccountLink: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.slate[100] },
  accountName: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  accountBalance: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  flexOne: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
