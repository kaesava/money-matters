import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';

export default function PaycheckReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  
  const incomeEventQuery = trpc.listIncomeEvents.useQuery();
  const planQuery = trpc.listAllocationPlan.useQuery({ incomeEventId: id! });
  const runAllocation = trpc.runAllocation.useMutation();

  const event = incomeEventQuery.data?.find(e => e.id === id);

  const formatAUD = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleGeneratePlan = async () => {
    if (!event) return;
    try {
      await runAllocation.mutateAsync({
        incomeEventId: event.id,
        incomeAmount: parseFloat(event.expectedAmount),
      });
      planQuery.refetch();
    } catch (err) {
      console.error("Failed to generate plan:", err);
    }
  };

  const handleConfirmPlan = async () => {
    // Confirmation handled server side or not needed anymore
    router.push({
      pathname: '/(app)/paychecks/transfer-instructions',
      params: { incomeEventId: id }
    });
  };

  if (planQuery.isLoading || incomeEventQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={DESIGN_TOKENS.colors.accent} size="large" />
      </View>
    );
  }

  const plan = planQuery.data;

  return (
    <MobileScreenWrapper
      title={t('paychecks.review.title', { defaultValue: 'Paycheck Review' })}
      user={session?.user}
      showBack={true}
      onBackPress={() => router.back()}
    >
      {event && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{event.sourceName || t('paychecks.source', { defaultValue: 'Source' })}</Text>
          <Text style={styles.summaryAmount}>{formatAUD(event.expectedAmount)}</Text>
          <Text style={styles.summaryDate}>
            {new Date(event.expectedDate).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}

      {!plan ? (
        <View style={styles.noPlan}>
          <Text style={styles.noPlanText}>{t('paychecks.review.noPlanYet', { defaultValue: 'Allocation plan not yet generated' })}</Text>
          <TouchableOpacity style={styles.generateBtn} onPress={handleGeneratePlan} disabled={runAllocation.isPending}>
            {runAllocation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.generateBtnText}>{t('paychecks.generatePlan', { defaultValue: 'Generate Plan' })}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.planContainer}>
          <Text style={styles.sectionTitle}>{t('paychecks.review.allocationBreakdown', { defaultValue: 'Allocation Breakdown' })}</Text>
          {plan.lines.map(line => (
            <View key={line.id} style={styles.lineRow}>
              <View style={styles.lineLeft}>
                <Text style={styles.categoryName}>{line.categoryName}</Text>
                {line.reasoning && <Text style={styles.reasoning}>{line.reasoning}</Text>}
              </View>
              <Text style={styles.lineAmount}>{formatAUD(line.proposedAmount)}</Text>
            </View>
          ))}

          {plan.status !== 'CONFIRMED' ? (
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPlan}>
              <Text style={styles.confirmBtnText}>{t('paychecks.review.confirmCta', { defaultValue: 'Confirm Allocation' })}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>{t('paychecks.review.confirmed', { defaultValue: 'Allocation Confirmed ✓' })}</Text>
            </View>
          )}
        </View>
      )}
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    backgroundColor: D.colors.primary,
    borderRadius: D.radius.xl,
    padding: 20,
    marginBottom: 24,
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  summaryDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  noPlan: { alignItems: 'center', paddingVertical: 40 },
  noPlanText: { fontSize: 15, color: D.colors.textMuted, marginBottom: 16 },
  generateBtn: { backgroundColor: D.colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: D.radius.md },
  generateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  planContainer: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 16 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lineLeft: { flex: 1, marginRight: 16 },
  categoryName: { fontSize: 15, fontWeight: '600', color: D.colors.textPrimary, marginBottom: 2 },
  reasoning: { fontSize: 12, color: D.colors.textMuted, fontStyle: 'italic' },
  lineAmount: { fontSize: 15, fontWeight: '700', color: D.colors.primary },
  confirmBtn: { backgroundColor: D.colors.accent, paddingVertical: 14, borderRadius: D.radius.md, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  confirmedBadge: { backgroundColor: D.colors.success + '15', paddingVertical: 12, borderRadius: D.radius.md, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  confirmedText: { color: D.colors.success, fontWeight: '700', fontSize: 14 },
});
