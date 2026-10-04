import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { PoolItemCard } from './PoolItemCard';

interface PoolGroupSectionProps {
  title: string;
  pools: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  bankAccounts: any[];
  categories: any[];
  expandedPools: Record<string, boolean>;
  onTogglePoolExpand: (id: string) => void;
}

export function PoolGroupSection({
  title,
  pools,
  isCollapsed,
  onToggleCollapse,
  bankAccounts,
  categories,
  expandedPools,
  onTogglePoolExpand,
}: PoolGroupSectionProps) {
  if (pools.length === 0) return null;

  return (
    <View style={styles.group}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleCollapse}
        style={styles.header}
      >
        <View style={styles.titleWrap}>
          <Feather
            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
            size={16}
            color="#1B2B4B"
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.count}>{pools.length}</Text>
      </TouchableOpacity>

      {!isCollapsed &&
        pools.map((p) => (
          <PoolItemCard
            key={p.id}
            pool={p}
            bank={bankAccounts.find((b) => b.id === p.bankAccountId)}
            categories={categories}
            isExpanded={!!expandedPools[p.id]}
            onToggleExpand={() => onTogglePoolExpand(p.id)}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  count: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
});
