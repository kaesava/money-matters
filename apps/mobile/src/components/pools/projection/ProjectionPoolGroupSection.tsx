import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { ProjectionPoolCard } from './ProjectionPoolCard';

interface ProjectionPoolGroupSectionProps {
  title: string;
  pools: Array<{
    id: string;
    name: string;
    poolType?: string;
    currentBalance: number;
    targetAmount?: string | number | null;
    bankAccountId?: string | null;
  }>;
  getBankForPool: (bankAccountId?: string | null) => { id: string; name: string; bankProvider?: string | null } | undefined;
  getPoolBalance: (poolId: string, currentBalance: number) => number;
  categories: Array<{ id: string; poolId?: string | null }>;
  isGoal?: boolean;
}

export const ProjectionPoolGroupSection: React.FC<ProjectionPoolGroupSectionProps> = ({
  title,
  pools,
  getBankForPool,
  getPoolBalance,
  categories,
  isGoal,
}) => {
  if (pools.length === 0) return null;

  return (
    <View style={styles.poolGroup}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupCount}>{pools.length}</Text>
      </View>

      {pools.map((pool) => {
        const bank = getBankForPool(pool.bankAccountId);
        const bal = getPoolBalance(pool.id, pool.currentBalance);
        const nestedCount = categories.filter((c) => c.poolId === pool.id).length;

        return (
          <ProjectionPoolCard
            key={pool.id}
            pool={pool}
            balance={bal}
            bank={bank}
            nestedCount={nestedCount}
            isGoal={isGoal}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  poolGroup: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  groupCount: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.subtleText,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
});
