import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

export interface GoalItem {
  id: string;
  name: string;
  currentBalance: number;
  targetAmount?: string | number | null;
  targetDate?: string | null;
  progressPercentage?: number;
  healthStatus?: 'GREEN' | 'AMBER' | 'RED';
}

export interface GoalsProgressStripProps {
  goals: GoalItem[];
}

export function GoalsProgressStrip({ goals }: GoalsProgressStripProps) {
  const router = useRouter();
  const D = DESIGN_TOKENS;

  if (!goals || goals.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="target" size={16} color={D.colors.accent} />
          <Text style={styles.sectionTitle}>
            {t('home.savingsGoals') || 'Savings Goals'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/categories')}
          style={styles.seeAllBtn}
        >
          <Text style={styles.seeAllText}>{t('common.seeAll') || 'See All'}</Text>
          <Feather name="chevron-right" size={14} color={D.colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const target = item.targetAmount ? parseFloat(String(item.targetAmount)) : 0;
          const pct = item.progressPercentage ?? (target > 0 ? Math.min(100, Math.round((item.currentBalance / target) * 100)) : 0);

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/(app)/pools/${item.id}` as never)}
              style={styles.goalCard}
            >
              <Text style={styles.goalName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.goalBalance}>{formatAUD(item.currentBalance)}</Text>

              {target > 0 ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${pct}%` },
                        item.healthStatus === 'RED' && styles.fillRed,
                        item.healthStatus === 'AMBER' && styles.fillAmber,
                      ]}
                    />
                  </View>
                  <View style={styles.progressMeta}>
                    <Text style={styles.progressPct}>{pct}%</Text>
                    <Text style={styles.targetAmount}>of {formatAUD(target)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noTargetText}>No target set</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  goalCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    marginBottom: 4,
  },
  goalBalance: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
    marginBottom: 8,
  },
  progressSection: {
    gap: 4,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  fillRed: {
    backgroundColor: '#ba1a1a',
  },
  fillAmber: {
    backgroundColor: '#f59e0b',
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPct: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  targetAmount: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  noTargetText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

export default GoalsProgressStrip;
