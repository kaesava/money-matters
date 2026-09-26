import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FormLabel } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';

interface PoolLinkSelectorProps {
  pools: Array<{
    id: string;
    name: string;
    poolType: string;
    currentBalance?: number | string;
    bankAccountId?: string | null;
  }>;
  selectedPoolIds: string[];
  onTogglePool: (poolId: string) => void;
}

export function PoolLinkSelector({
  pools,
  selectedPoolIds,
  onTogglePool,
}: PoolLinkSelectorProps) {
  if (pools.length === 0) return null;

  return (
    <View style={styles.container}>
      <FormLabel>Link Pools to this Account</FormLabel>
      <View style={styles.list}>
        {pools.map((pool) => {
          const isSelected = selectedPoolIds.includes(pool.id);
          const bal = typeof pool.currentBalance === 'number'
            ? pool.currentBalance
            : parseFloat(String(pool.currentBalance || '0'));

          return (
            <TouchableOpacity
              key={pool.id}
              onPress={() => onTogglePool(pool.id)}
              style={[styles.poolRow, isSelected && styles.poolRowSelected]}
              activeOpacity={0.7}
            >
              <View style={styles.poolLeft}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Feather name="check" size={12} color="#FFFFFF" />}
                </View>
                <View>
                  <Text style={[styles.poolName, isSelected && styles.poolNameSelected]}>
                    {pool.name}
                  </Text>
                  <Text style={styles.poolType}>
                    {pool.poolType === 'EVERYDAY'
                      ? 'Everyday'
                      : pool.poolType === 'REGULAR'
                      ? 'Bills'
                      : 'Goal'}
                  </Text>
                </View>
              </View>

              <Text style={styles.poolBal}>{formatAUD(bal)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 4,
  },
  list: {
    gap: 6,
  },
  poolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  poolRowSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#EFF6FF',
  },
  poolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  poolName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  poolNameSelected: {
    color: '#2563eb',
  },
  poolType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  poolBal: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#64748B',
  },
});
