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
          <Feather name="target" size={16} color="#2563eb" />
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
          <Feather name="chevron-right" size={14} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const bal =
            typeof item.currentBalance === 'number'
              ? item.currentBalance
              : parseFloat(String(item.currentBalance || '0'));
          const target = item.targetAmount
            ? parseFloat(String(item.targetAmount))
            : 0;
          const fundedPct =
            target > 0 ? Math.min(100, Math.round((bal / target) * 100)) : 0;

          let timeElapsedPct: number | null = null;
          let isOverdue = false;

          if (item.targetDate) {
            const targetTime = new Date(item.targetDate).getTime();
            const createdTime = item.createdAt
              ? new Date(item.createdAt).getTime()
              : targetTime - 90 * 24 * 60 * 60 * 1000;
            const totalDuration = Math.max(1, targetTime - createdTime);
            const elapsedDuration = Math.max(0, nowTime - createdTime);
            timeElapsedPct = Math.min(
              100,
              Math.max(0, Math.round((elapsedDuration / totalDuration) * 100))
            );
            isOverdue = nowTime > targetTime && fundedPct < 100;
          }

          const isCompleted = fundedPct >= 100;
          const isLagging =
            timeElapsedPct !== null && fundedPct < timeElapsedPct * 0.8;
          const isJustBehind =
            timeElapsedPct !== null &&
            fundedPct < timeElapsedPct &&
            !isLagging;
          const isOnTrack =
            timeElapsedPct !== null
              ? fundedPct >= timeElapsedPct
              : fundedPct >= 50;

          const barColor = isCompleted
            ? '#22c55e'
            : isOverdue || isLagging
            ? '#ba1a1a'
            : isJustBehind
            ? '#f59e0b'
            : isOnTrack
            ? '#22c55e'
            : '#2563eb';

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/(app)/pools/${item.id}` as never)}
              style={styles.goalCard}
            >
              <Text style={styles.goalName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.goalBalance}>{formatAUD(bal)}</Text>

              {target > 0 ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${fundedPct}%`, backgroundColor: barColor },
                      ]}
                    />
                    {timeElapsedPct !== null &&
                      timeElapsedPct > 0 &&
                      timeElapsedPct < 100 && (
                        <View
                          style={[
                            styles.needleIndicator,
                            { left: `${timeElapsedPct}%` },
                          ]}
                        />
                      )}
                  </View>

                  <View style={styles.progressMeta}>
                    <Text style={styles.progressPct}>
                      {t('dashboard.goals.funded', { percent: fundedPct })}
                    </Text>
                    <Text style={styles.targetAmount}>
                      {formatAUD(target)}
                    </Text>
                  </View>

                  <View style={styles.statusMeta}>
                    {isOverdue ? (
                      <Text style={styles.overdueText}>
                        {t('common.overdue')}
                      </Text>
                    ) : timeElapsedPct !== null ? (
                      <Text
                        style={[
                          styles.pacingText,
                          isOnTrack
                            ? styles.textGreen
                            : isJustBehind
                            ? styles.textAmber
                            : styles.textRed,
                        ]}
                      >
                        {isOnTrack
                          ? t('dashboard.goals.onTrackBadge')
                          : isJustBehind
                          ? t('dashboard.goals.justBehind')
                          : t('dashboard.goals.lagging')}{' '}
                        {t('dashboard.goals.pace', { percent: timeElapsedPct })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={styles.noTargetText}>{t('common.optional')}</Text>
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
    color: '#1B2B4B',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
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
    gap: 10,
  },
  goalCard: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    marginBottom: 2,
  },
  goalBalance: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
    marginBottom: 6,
  },
  progressSection: {
    gap: 4,
  },
  progressBarTrack: {
    position: 'relative',
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  needleIndicator: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: '#1E293B',
    borderRadius: 1,
    marginLeft: -1,
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
  statusMeta: {
    marginTop: 1,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ba1a1a',
  },
  pacingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textGreen: {
    color: '#15803D',
  },
  textAmber: {
    color: '#D97706',
  },
  textRed: {
    color: '#ba1a1a',
  },
  noTargetText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

export default GoalsProgressStrip;
