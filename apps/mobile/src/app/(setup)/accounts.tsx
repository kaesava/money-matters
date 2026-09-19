import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { InfoTooltip } from '../../components/InfoTooltip';

export default function SetupBankAccountsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    incomeName?: string;
    incomeAmount?: string;
    incomeFrequency?: string;
    mode?: string;
  }>();

  const utils = trpc.useUtils();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const createAccountMut = trpc.createBankAccount.useMutation();
  const updateAccountMut = trpc.updateBankAccount.useMutation();
  const updatePref = trpc.updateUserPreferences.useMutation();

  const accounts = bankAccountsQuery.data ?? [];
  const [selectedArchetype, setSelectedArchetype] = useState<string>(
    accounts.length >= 2 ? 'AUSSIE_2_ACCOUNT' : 'ALL_IN_ONE_CUSTOM'
  );
  const [isApplying, setIsApplying] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const applyArchetype = async (type: 'AUSSIE_2_ACCOUNT' | 'COUPLES_HYBRID' | 'ALL_IN_ONE_CUSTOM') => {
    setSelectedArchetype(type);
    setIsApplying(true);
    try {
      if (type === 'AUSSIE_2_ACCOUNT') {
        if (accounts.length === 1) {
          const first = accounts[0];
          if (first) {
            await updateAccountMut.mutateAsync({
              accountId: first.id,
              data: { name: 'Everyday Spending Card', bankProvider: (first.bankProvider as any) || 'CBA' },
            });
          }
          await createAccountMut.mutateAsync({
            name: 'Bills & Savings Account',
            bankProvider: 'CBA',
            lastKnownBalance: '1000.00',
            unbudgetedBuffer: '0.00',
            isPrivate: false,
          });
        }
      } else if (type === 'COUPLES_HYBRID') {
        if (accounts.length < 3) {
          if (accounts[0]) {
            await updateAccountMut.mutateAsync({
              accountId: accounts[0].id,
              data: { name: 'Joint Bills & Rent', bankProvider: (accounts[0].bankProvider as any) || 'CBA' },
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
        }
      } else if (type === 'ALL_IN_ONE_CUSTOM') {
        if (accounts.length === 1 && accounts[0]) {
          await updateAccountMut.mutateAsync({
            accountId: accounts[0].id,
            data: { name: 'Primary Account', bankProvider: (accounts[0].bankProvider as any) || 'CBA' },
          });
        }
      }
      await bankAccountsQuery.refetch();
    } catch (_err) {
      // Handled silently
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = () => {
    showMobileConfirm({
      title: t('setup.skipConfirmTitle'),
      message: t('setup.skipConfirmMessage'),
      confirmText: t('setup.skipConfirmButton'),
      onConfirm: async () => {
        try {
          await updatePref.mutateAsync({ setupCompleted: true });
        } catch (_e) {
          // Ignore
        }
        router.replace('/(app)/home');
      },
    });
  };

  const handleNext = () => {
    router.push({
      pathname: '/(setup)/categories' as any,
      params: {
        incomeName: params.incomeName,
        incomeAmount: params.incomeAmount,
        incomeFrequency: params.incomeFrequency,
        mode: params.mode,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Top Nav Row */}
      <View style={styles.topNavRow}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipBtnText}>{t('setup.skipForNow')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 2, total: 3, defaultValue: 'Step 2 of 3' })}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={styles.title}>{t('setup.bankAccountsStep.title')}</Text>
        <InfoTooltip
          title="Bank Accounts & Routing"
          content={t('setup.bankAccountsStep.tooltip')}
        />
      </View>
      <Text style={styles.subtitle}>{t('setup.bankAccountsStep.subtitle')}</Text>

      {/* Archetype Selector Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setup.bankAccountsStep.archetypeTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('setup.bankAccountsStep.archetypeSubtitle')}</Text>
      </View>

      {/* Archetype 1: Aussie 2-Account Blueprint */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => applyArchetype('AUSSIE_2_ACCOUNT')}
        style={[
          styles.archetypeCard,
          selectedArchetype === 'AUSSIE_2_ACCOUNT' && styles.archetypeCardActive,
        ]}
      >
        <View style={styles.archetypeTop}>
          <Text style={styles.archetypeEmoji}>🇦🇺</Text>
          <View style={styles.badgeRecommended}>
            <Text style={styles.badgeTextRecommended}>
              {t('setup.bankAccountsStep.archetype2AccountBadge')}
            </Text>
          </View>
        </View>
        <Text style={styles.archetypeName}>
          {t('setup.bankAccountsStep.archetype2AccountTitle')}
        </Text>
        <Text style={styles.archetypeDesc}>
          {t('setup.bankAccountsStep.archetype2AccountDesc')}
        </Text>
      </TouchableOpacity>

      {/* Archetype 2: Couples Hybrid */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => applyArchetype('COUPLES_HYBRID')}
        style={[
          styles.archetypeCard,
          selectedArchetype === 'COUPLES_HYBRID' && styles.archetypeCardActive,
        ]}
      >
        <View style={styles.archetypeTop}>
          <Text style={styles.archetypeEmoji}>👥</Text>
          <View style={styles.badgeCouples}>
            <Text style={styles.badgeTextCouples}>
              {t('setup.bankAccountsStep.archetypeCouplesBadge')}
            </Text>
          </View>
        </View>
        <Text style={styles.archetypeName}>
          {t('setup.bankAccountsStep.archetypeCouplesTitle')}
        </Text>
        <Text style={styles.archetypeDesc}>
          {t('setup.bankAccountsStep.archetypeCouplesDesc')}
        </Text>
      </TouchableOpacity>

      {/* Archetype 3: All in One Virtual */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => applyArchetype('ALL_IN_ONE_CUSTOM')}
        style={[
          styles.archetypeCard,
          selectedArchetype === 'ALL_IN_ONE_CUSTOM' && styles.archetypeCardActive,
        ]}
      >
        <View style={styles.archetypeTop}>
          <Text style={styles.archetypeEmoji}>📱</Text>
          <View style={styles.badgeNeutral}>
            <Text style={styles.badgeTextNeutral}>
              {t('setup.bankAccountsStep.archetype1AccountBadge')}
            </Text>
          </View>
        </View>
        <Text style={styles.archetypeName}>
          {t('setup.bankAccountsStep.archetype1AccountTitle')}
        </Text>
        <Text style={styles.archetypeDesc}>
          {t('setup.bankAccountsStep.archetype1AccountDesc')}
        </Text>
      </TouchableOpacity>

      {/* 60-Second Bank Cheat Sheet Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowCheatSheet(true)}
        style={styles.cheatSheetBanner}
      >
        <Text style={styles.cheatSheetBannerText}>
          {t('setup.bankAccountsStep.cheatSheetLink')}
        </Text>
      </TouchableOpacity>

      {/* Current Accounts List */}
      <View style={styles.accountsBox}>
        <Text style={styles.accountsBoxTitle}>Active Accounts ({accounts.length})</Text>
        {accounts.map((acc) => (
          <View key={acc.id} style={styles.accountRow}>
            <View style={{ flex: 1 }}>
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

      {/* Navigation Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          style={styles.nextBtn}
          disabled={isApplying}
        >
          {isApplying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.nextBtnText}>{t('setup.nextStep')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 60-Second Cheat Sheet Modal */}
      <Modal
        visible={showCheatSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheatSheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('setup.bankAccountsStep.cheatSheetTitle')}</Text>
              <TouchableOpacity onPress={() => setShowCheatSheet(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.modalSubtitle}>{t('setup.bankAccountsStep.cheatSheetSubtitle')}</Text>
              
              <View style={styles.cheatSheetSection}>
                <Text style={styles.cheatSheetBankName}>🟡 {t('setup.bankAccountsStep.cheatSheetCba')}</Text>
                <Text style={styles.cheatSheetSteps}>{t('setup.bankAccountsStep.cheatSheetCbaSteps')}</Text>
              </View>

              <View style={styles.cheatSheetSection}>
                <Text style={styles.cheatSheetBankName}>⚡ {t('setup.bankAccountsStep.cheatSheetUp')}</Text>
                <Text style={styles.cheatSheetSteps}>{t('setup.bankAccountsStep.cheatSheetUpSteps')}</Text>
              </View>

              <View style={styles.cheatSheetSection}>
                <Text style={styles.cheatSheetBankName}>⚫ {t('setup.bankAccountsStep.cheatSheetMacquarie')}</Text>
                <Text style={styles.cheatSheetSteps}>{t('setup.bankAccountsStep.cheatSheetMacquarieSteps')}</Text>
              </View>

              <View style={styles.cheatSheetSection}>
                <Text style={styles.cheatSheetBankName}>🟠 {t('setup.bankAccountsStep.cheatSheetIng')}</Text>
                <Text style={styles.cheatSheetSteps}>{t('setup.bankAccountsStep.cheatSheetIngSteps')}</Text>
              </View>

              <View style={styles.cheatSheetSection}>
                <Text style={styles.cheatSheetBankName}>🏛️ {t('setup.bankAccountsStep.cheatSheetOther')}</Text>
                <Text style={styles.cheatSheetSteps}>{t('setup.bankAccountsStep.cheatSheetOtherSteps')}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowCheatSheet(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>{t('setup.bankAccountsStep.cheatSheetClose')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    flexGrow: 1,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: '#2563eb',
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1B2B4B',
    marginRight: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  archetypeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  archetypeCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#EFF6FF',
  },
  archetypeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  archetypeEmoji: {
    fontSize: 20,
  },
  archetypeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 4,
  },
  archetypeDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  badgeRecommended: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeTextRecommended: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  badgeCouples: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeTextCouples: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
  },
  badgeNeutral: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeTextNeutral: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cheatSheetBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  cheatSheetBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    textAlign: 'center',
  },
  accountsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  accountsBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 10,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  accountBalance: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1B2B4B',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  cheatSheetSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  cheatSheetBankName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 2,
  },
  cheatSheetSteps: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
