import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { GoalProgressStripCard } from './goals/GoalProgressStripCard';

export interface GoalItem {
  id: string;
  name: string;
  currentBalance: number | string;
  targetAmount?: string | number | null;
  targetDate?: string | null;
  progressPercentage?: number;
  healthStatus?: 'GREEN' | 'AMBER' | 'RED';
  createdAt?: string | Date | null;
}

export interface GoalsProgressStripProps {
  goals: GoalItem[];
}

export function GoalsProgressStrip({ goals }: GoalsProgressStripProps) {
  const router = useRouter();

  if (!goals || goals.length === 0) return null;

  const totalGoals = goals.length;
  const onTrackGoals = goals.filter(
    (g) => g.healthStatus === 'GREEN' || !g.healthStatus
  ).length;

  const nowTime = new Date().getTime();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="target" size={16} color={DESIGN_TOKENS.colors.accent} />
          <Text style={styles.sectionTitle}>{t('dashboard.goals.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {onTrackGoals === totalGoals
                ? t('dashboard.goals.allOnTrack', { total: totalGoals })
                : t('dashboard.goals.onTrack', {
                    count: onTrackGoals,
                    total: totalGoals,
                  })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(app)/categories' as never)}
          style={styles.seeAllBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>{t('dashboard.goals.viewAll')}</Text>
          <Feather name="chevron-right" size={14} color={DESIGN_TOKENS.colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GoalProgressStripCard item={item} nowTime={nowTime} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  countBadge: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
});

export default GoalsProgressStrip;
