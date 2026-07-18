import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../../lib/trpc';

function fmt(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
}

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: categories, isLoading } = trpc.listCategories.useQuery();
  const cat = categories?.find((c) => c?.id === id);

  const D = DESIGN_TOKENS;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={D.colors.accent} size="large" />
        <Text style={{ marginTop: 12, color: D.colors.textMuted }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!cat) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('common.error')}</Text>
      </View>
    );
  }

  const currentBalanceNum = parseFloat(cat.currentBalance);
  const targetAmountNum = cat.targetAmount ? parseFloat(cat.targetAmount) : null;

  const pct = targetAmountNum && targetAmountNum > 0
    ? Math.min(Math.round((currentBalanceNum / targetAmountNum) * 100), 100)
    : null;

  const color =
    cat.healthStatus === 'GREEN' ? D.colors.success :
    cat.healthStatus === 'AMBER' ? D.colors.warning :
    cat.healthStatus === 'RED' ? D.colors.critical :
    D.colors.accent;

  return (
    <MobileScreenWrapper
      title={cat.name}
      showBack={true}
      onBackPress={() => router.back()}
      showProfile={false}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.metaLabel}>{t('buckets.detail.currentBalance')}</Text>
            <Text style={[styles.balanceValue, { color }]}>{fmt(cat.currentBalance)}</Text>
          </View>
          {cat.targetAmount && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>{t('buckets.detail.targetAmount')}</Text>
              <Text style={styles.targetValue}>{fmt(cat.targetAmount)}</Text>
            </View>
          )}
        </View>

        {pct !== null && (
          <>
            <Text style={styles.metaLabel}>{t('buckets.detail.progressBar')}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.pctText, { color }]}>{pct}%</Text>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('buckets.detail.history')}</Text>
      <View style={styles.emptyHistory}>
        <Text style={styles.emptyText}>{t('buckets.detail.noHistory')}</Text>
      </View>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: D.colors.background },
  loadingText: { fontSize: 14, color: D.colors.textMuted },
  container: { paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 100 },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: D.colors.accent },
  title: { fontSize: 22, fontWeight: '700', color: D.colors.primary, marginBottom: 16 },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.lg, padding: D.spacing.cardPadding, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metaLabel: { fontSize: 11, color: D.colors.textMuted, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 26, fontWeight: '700' },
  targetValue: { fontSize: 18, fontWeight: '600', color: D.colors.textPrimary },
  barBg: { height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 6 },
  barFill: { height: 8, borderRadius: 4 },
  pctText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  emptyHistory: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 13, color: D.colors.textMuted },
});
