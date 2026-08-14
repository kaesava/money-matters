import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';
import { MobileCategoryItem } from './MobileEverydayPoolSection';

interface MobileSavingsGoalsSectionProps {
  categories: MobileCategoryItem[];
  onEditCategory: (cat: MobileCategoryItem) => void;
  onArchiveCategory: (cat: MobileCategoryItem) => void;
}

function pct(balance?: string | null, target?: string | null) {
  if (!balance) return null;
  const balanceNum = parseFloat(balance);
  const targetNum = target ? parseFloat(target) : null;
  if (!targetNum || targetNum === 0) return null;
  return Math.min(Math.round((balanceNum / targetNum) * 100), 100);
}


export function MobileSavingsGoalsSection({
  categories,
  onEditCategory,
  onArchiveCategory,
}: MobileSavingsGoalsSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>🎯 Save Toward (Goals)</Text>
          <Text style={styles.sectionSubtitle}>Individual Target Pools</Text>
        </View>
        <Text style={styles.sectionGoalCount}>{categories.length} pools</Text>
      </View>

      <View style={styles.sectionContent}>
        {categories.length === 0 ? (
          <Text style={styles.emptyText}>No Savings Goals matched filters.</Text>
        ) : (
          categories.map((cat) => {
            const progress = pct(cat.currentBalance, cat.targetAmount);
            const healthColor =
              cat.healthStatus === 'GREEN' ? '#22c55e' : cat.healthStatus === 'AMBER' ? '#f59e0b' : '#ef4444';

            let daysLeftText: string | null = null;
            if (cat.targetDate) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tDate = new Date(cat.targetDate);
              tDate.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((tDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              daysLeftText = diffDays > 0 ? `${diffDays}d left` : diffDays === 0 ? 'Due today' : `${Math.abs(diffDays)}d late`;
            }

            return (
              <View key={cat.id} style={styles.goalItemCard}>
                <View style={styles.goalTopRow}>
                  <TouchableOpacity
                    onPress={() => router.push(`/(app)/categories/${cat.id}` as Href)}
                    style={{ flex: 1 }}
                  >
                    <Text style={styles.goalName}>{cat.name}</Text>
                    {daysLeftText && <Text style={styles.goalDueText}>{daysLeftText}</Text>}
                  </TouchableOpacity>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.goalBalance}>{formatAUD(cat.currentBalance || 0)}</Text>
                    <Text style={styles.goalTarget}>
                      of {cat.targetAmount ? formatAUD(cat.targetAmount) : '—'}
                    </Text>
                  </View>

                </View>

                {progress !== null && (
                  <View style={styles.goalProgressWrap}>
                    <View style={styles.goalTrack}>
                      <View style={[styles.goalFill, { width: `${progress}%`, backgroundColor: healthColor }]} />
                    </View>
                    <View style={styles.goalProgressLabels}>
                      <Text style={[styles.goalStatusText, { color: healthColor }]}>
                        {cat.healthStatus === 'GREEN'
                          ? 'On Track'
                          : cat.healthStatus === 'AMBER'
                          ? 'Needs Attention'
                          : 'Behind'}
                      </Text>
                      <Text style={styles.goalPctText}>{progress}%</Text>
                    </View>
                  </View>
                )}

                <View style={styles.goalActionRow}>
                  <TouchableOpacity onPress={() => onEditCategory(cat)} style={styles.goalActionBtn}>
                    <Text style={styles.goalActionBtnText}>Edit Goal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onArchiveCategory(cat)}
                    style={[styles.goalActionBtn, { backgroundColor: '#FEF2F2' }]}
                  >
                    <Text style={[styles.goalActionBtnText, { color: '#EF4444' }]}>Archive</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  sectionGoalCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionContent: {
    padding: 12,
    gap: 10,
  },
  goalItemCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    gap: 8,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B21A8',
  },
  goalDueText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9333EA',
    marginTop: 2,
  },
  goalBalance: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: '#1B2B4B',
  },
  goalTarget: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#64748B',
  },
  goalProgressWrap: {
    gap: 4,
  },
  goalTrack: {
    height: 6,
    backgroundColor: '#E9D5FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  goalPctText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  goalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  goalActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
