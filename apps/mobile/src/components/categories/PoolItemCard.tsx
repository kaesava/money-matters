import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, CardDrawerIndicator } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { useRouter } from 'expo-router';

interface PoolItemCardProps {
  pool: any;
  bank?: any;
  categories: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function PoolItemCard({
  pool,
  bank,
  categories,
  isExpanded,
  onToggleExpand,
}: PoolItemCardProps) {
  const router = useRouter();
  const poolCats = categories.filter((c) => c.poolId === pool.id);
  const nestedCount = poolCats.length;
  const isGoal = pool.poolType === 'GOAL';
  const target = pool.targetAmount ? parseFloat(pool.targetAmount) : 0;
  const pct = target > 0 ? Math.min(100, Math.round(((pool.currentBalance || 0) / target) * 100)) : 0;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(app)/pools/${pool.id}` as never)}
        style={styles.cardHeader}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.poolName}>{pool.name}</Text>
            {pool.isSurplusTarget && (
              <View style={styles.surplusBadge}>
                <Text style={styles.surplusBadgeText}>{t('categories.surplusBadgeText')}</Text>
              </View>
            )}
          </View>
          {bank && (
            <View style={styles.bankBadgeWrap}>
              <Text style={styles.bankNameText}>{bank.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.balWrap}>
          <View style={styles.balCol}>
            <Text style={styles.balNum}>{formatAUD(pool.currentBalance)}</Text>
            <Text style={styles.balSub}>
              {isGoal
                ? target > 0
                  ? `${pct}% of ${formatAUD(target)}`
                  : t('categories.noTarget')
                : nestedCount > 0
                ? t('categories.nestedCategories', { count: nestedCount })
                : t('categories.mainPool')}
            </Text>
          </View>
          <CardDrawerIndicator size={18} />
        </View>
      </TouchableOpacity>

      {isGoal && target > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      )}

      {nestedCount > 0 && !isGoal && (
        <View style={styles.nestedSection}>
          <TouchableOpacity onPress={onToggleExpand} style={styles.nestedToggleBtn} activeOpacity={0.7}>
            <Feather name={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} color="#64748B" />
            <Text style={styles.nestedToggleText}>
              {t('categories.nestedCategories', { count: nestedCount })}
            </Text>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.nestedCategoriesList}>
              {poolCats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.nestedCategoryRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(
                      `/(app)/categories/${cat.id}?returnTo=${encodeURIComponent('/(app)/categories')}` as never
                    )
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nestedCatName}>{cat.name}</Text>
                    <Text style={styles.nestedCatMeta}>
                      {cat.budgetFrequency || t('categories.frequencyMonthly')}
                    </Text>
                  </View>
                  <View style={styles.nestedCatAmountCol}>
                    <Text style={styles.nestedCatAmount}>
                      ${parseFloat(cat.monthlyAmount || '0').toFixed(2)}/mo
                    </Text>
                    {cat.enteredAmount && cat.budgetFrequency && cat.budgetFrequency !== 'MONTHLY' && (
                      <Text style={styles.nestedCatSubAmount}>
                        (${parseFloat(cat.enteredAmount).toFixed(2)}/{cat.budgetFrequency.toLowerCase()})
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  poolName: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  surplusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  surplusBadgeText: { fontSize: 9, fontWeight: '700', color: '#047857' },
  bankBadgeWrap: { marginTop: 3 },
  bankNameText: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted },
  balWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balCol: { alignItems: 'flex-end' },
  balNum: { fontSize: 14, fontWeight: '800', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.primary },
  balSub: { fontSize: 10, color: DESIGN_TOKENS.colors.textMuted, marginTop: 1 },
  progressTrack: { height: 4, backgroundColor: '#F1F5F9', width: '100%' },
  progressFill: { height: '100%', backgroundColor: DESIGN_TOKENS.colors.accent },
  nestedSection: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 8 },
  nestedToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  nestedToggleText: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
  nestedCategoriesList: { marginTop: 6, gap: 6, paddingLeft: 8 },
  nestedCategoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  nestedCatName: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  nestedCatMeta: { fontSize: 10, color: DESIGN_TOKENS.colors.textMuted },
  nestedCatAmountCol: { alignItems: 'flex-end' },
  nestedCatAmount: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.primary },
  nestedCatSubAmount: { fontSize: 10, color: DESIGN_TOKENS.colors.textMuted, fontFamily: 'monospace' },
});
