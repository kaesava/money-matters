import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';

export default function TransferInstructionsScreen() {
  const { incomeEventId } = useLocalSearchParams<{ incomeEventId: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: tenant, isLoading: loadingTenant } = trpc.getTenant.useQuery();
  const planQuery = trpc.listAllocationPlan.useQuery({ incomeEventId: incomeEventId! });

  const formatAUD = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loadingTenant || planQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={DESIGN_TOKENS.colors.accent} size="large" />
      </View>
    );
  }

  const bankAccounts = tenant?.bankAccounts ?? [];
  const plan = planQuery.data;

  // Compute transfer sum per bank account based on the plan categories mapping
  // V1 maps at Category Type level: Savings accounts host MAJOR & RECURRING, Everyday hosts EVERYDAY.
  const savingsAccounts = bankAccounts.filter(a => a.purpose.includes('SAVINGS'));
  const everydayAccounts = bankAccounts.filter(a => a.purpose.includes('EVERYDAY'));

  let majorRecurringSum = 0;
  let everydaySum = 0;

  if (plan) {
    plan.lines.forEach(line => {
      // Find category mapping or default by name checking
      const amt = parseFloat(line.confirmedAmount || line.proposedAmount || '0');
      // For V1 split allocation logic
      if (line.categoryName.toLowerCase().includes('groceries') || 
          line.categoryName.toLowerCase().includes('petrol') ||
          line.categoryName.toLowerCase().includes('eating out') ||
          line.categoryName.toLowerCase().includes('everyday')) {
        everydaySum += amt;
      } else {
        majorRecurringSum += amt;
      }
    });
  }

  return (
    <MobileScreenWrapper
      title={t('paychecks.review.transferInstructions', { defaultValue: 'Transfer Instructions' })}
      user={session?.user}
      showBack={true}
      onBackPress={() => router.back()}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <Text style={styles.celebrationText}>🎉</Text>
          <Text style={styles.successHeading}>{t('paychecks.transfer.allDone', { defaultValue: 'Your paycheck is allocated ✓' })}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('paychecks.review.transferInstructions', { defaultValue: 'Transfer Instructions' })}</Text>

        {savingsAccounts.map(account => (
          <View key={account.id} style={styles.instructionCard}>
            <Text style={styles.accountLabel}>{account.name}</Text>
            {account.isOffset ? (
              <Text style={styles.offsetText}>{t('paychecks.review.offsetAccount', { defaultValue: 'Offset account — no transfer needed' })}</Text>
            ) : (
              <Text style={styles.amountText}>{formatAUD(majorRecurringSum)}</Text>
            )}
          </View>
        ))}

        {everydayAccounts.map(account => (
          <View key={account.id} style={styles.instructionCard}>
            <Text style={styles.accountLabel}>{account.name}</Text>
            <Text style={styles.amountText}>{formatAUD(everydaySum)}</Text>
            <Text style={styles.everydayLabel}>{t('paychecks.transfer.everydayLabel', { defaultValue: 'Keep in everyday account' })}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.doneBtnText}>{t('common.done', { defaultValue: 'Done' })}</Text>
        </TouchableOpacity>
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 60 },
  headerCard: { alignItems: 'center', padding: 24, marginBottom: 24 },
  celebrationText: { fontSize: 48, marginBottom: 12 },
  successHeading: { fontSize: 20, fontWeight: '700', color: D.colors.primary, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 16 },
  instructionCard: {
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accountLabel: { fontSize: 13, color: D.colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  amountText: { fontSize: 24, fontWeight: '700', color: D.colors.primary, marginBottom: 4 },
  offsetText: { fontSize: 14, color: D.colors.success, fontWeight: '600' },
  everydayLabel: { fontSize: 12, color: D.colors.textMuted, marginTop: 4 },
  doneBtn: { backgroundColor: D.colors.accent, paddingVertical: 14, borderRadius: D.radius.md, alignItems: 'center', marginTop: 24 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
