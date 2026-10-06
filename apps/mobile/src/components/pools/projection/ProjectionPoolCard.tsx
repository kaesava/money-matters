import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  DESIGN_TOKENS,
  BankProviderBadge,
  CardDrawerIndicator,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface ProjectionPoolCardProps {
  pool: {
    id: string;
    name: string;
    poolType?: string;
    targetAmount?: string | number | null;
  };
  balance: number;
  bank?: { id: string; name: string; bankProvider?: string | null } | null;
  nestedCount: number;
  isGoal?: boolean;
}

export const ProjectionPoolCard: React.FC<ProjectionPoolCardProps> = ({
  pool,
  balance,
  bank,
  nestedCount,
  isGoal,
}) => {
  const router = useRouter();
  const target = pool.targetAmount ? parseFloat(String(pool.targetAmount)) : 0;
  const pct = target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(app)/pools/${pool.id}` as never)}
      style={styles.poolCard}
    >
      <View style={styles.cardHeader}>
        <View style={styles.flex1}>
          <Text style={styles.poolName}>{pool.name}</Text>
          {bank && (
            <View style={styles.bankBadgeWrap}>
              <BankProviderBadge
                provider={bank.bankProvider || undefined}
                size="sm"
              />
              <Text style={styles.bankNameText}>{bank.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.balWrap}>
          <View style={styles.balCol}>
            <Text style={styles.balNum}>{formatAUD(balance)}</Text>
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
      </View>

      {isGoal && target > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  poolCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolName: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  bankBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bankNameText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  balWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balCol: {
    alignItems: 'flex-end',
  },
  balNum: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  balSub: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.subtleText,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: DESIGN_TOKENS.colors.success,
    borderRadius: 2.5,
  },
});
