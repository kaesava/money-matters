import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';

const SECTION_ORDER = ['MAJOR', 'RECURRING', 'EVERYDAY'] as const;
const SECTION_TITLES: Record<string, string> = {
  MAJOR: 'buckets.majorSection',
  RECURRING: 'buckets.recurringSection',
  EVERYDAY: 'buckets.everydaySection',
};

function pct(balance: string, target: string | null) {
  const balanceNum = parseFloat(balance);
  const targetNum = target ? parseFloat(target) : null;
  if (!targetNum || targetNum === 0) return null;
  return Math.min(Math.round((balanceNum / targetNum) * 100), 100);
}

function fmt(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function BucketsScreen() {
  const router = useRouter();
  const { data: categories, isLoading } = trpc.listCategories.useQuery();

  const grouped = (categories ?? []).reduce<Record<string, typeof categories>>((acc, cat) => {
    const key = cat!.type;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(cat);
    return acc;
  }, {});

  const D = DESIGN_TOKENS;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: D.colors.background }} contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>{t('buckets.title')}</Text>

      {isLoading && <ActivityIndicator color={D.colors.accent} style={{ marginTop: 40 }} />}

      {SECTION_ORDER.map((section) => {
        const items = grouped[section] ?? [];
        if (items.length === 0) return null;
        return (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(SECTION_TITLES[section] ?? '')}</Text>
            {items.map((cat) => {
              if (!cat) return null;
              const p = pct(cat.currentBalance, cat.targetAmount);
              const color =
                cat.healthStatus === 'GREEN' ? D.colors.success :
                cat.healthStatus === 'AMBER' ? D.colors.warning :
                cat.healthStatus === 'RED' ? D.colors.critical :
                D.colors.accent;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.card}
                  onPress={() => router.push(`/(app)/buckets/${cat.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={[styles.catBalance, { color }]}>{fmt(cat.currentBalance)}</Text>
                  </View>
                  {cat.targetAmount && (
                    <Text style={styles.target}>{t('buckets.target')} {fmt(cat.targetAmount)}</Text>
                  )}
                  {p !== null && (
                    <>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.pctLabel, { color }]}>{t('buckets.progressPct', { pct: p })}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 100 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: D.colors.primary, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 10 },
  card: {
    backgroundColor: D.colors.surface, borderRadius: D.radius.lg,
    padding: D.spacing.cardPadding, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { fontSize: 14, fontWeight: '600', color: D.colors.textPrimary, flex: 1 },
  catBalance: { fontSize: 15, fontWeight: '700' },
  target: { fontSize: 11, color: D.colors.textMuted, marginBottom: 8 },
  barBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 5, borderRadius: 3 },
  pctLabel: { fontSize: 11, fontWeight: '600' },
});
