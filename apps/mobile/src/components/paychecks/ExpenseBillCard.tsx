import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatAUD, formatScheduleDetail } from '../../lib/format';

export interface ExpenseSourceItem {
  id: string;
  name: string;
  amount: string;
  poolId?: string | null;
  categoryId?: string | null;
  poolName?: string | null;
  categoryName?: string | null;
  rrule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface ExpenseBillCardProps {
  exp: ExpenseSourceItem;
  categoryName: string;
  onEdit: (exp: ExpenseSourceItem) => void;
}

export const ExpenseBillCard: React.FC<ExpenseBillCardProps> = ({
  exp,
  categoryName,
  onEdit,
}) => {
  const displayBucket = categoryName || exp.poolName || exp.categoryName;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEdit(exp)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {exp.name}
          </Text>
          {displayBucket ? (
            <View style={styles.poolTag}>
              <Feather name="folder" size={11} color="#64748B" />
              <Text style={styles.poolText} numberOfLines={1}>
                {displayBucket}
              </Text>
            </View>
          ) : null}
        </View>

        <Feather name="chevron-right" size={18} color="#94A3B8" />
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.amount}>−{formatAUD(exp.amount)}</Text>
        <Text style={styles.freqText}>
          {formatScheduleDetail(exp.rrule, exp.startDate).detailText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  poolTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 1,
  },
  poolText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    flexShrink: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  freqText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
