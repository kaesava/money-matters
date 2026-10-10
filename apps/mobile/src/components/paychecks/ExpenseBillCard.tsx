import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CardDrawerIndicator, EntityLinkChip, DESIGN_TOKENS } from '@money-matters/ui/mobile';
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
  onOccurrences?: (exp: ExpenseSourceItem) => void;
}

export const ExpenseBillCard: React.FC<ExpenseBillCardProps> = ({
  exp,
  categoryName,
  onEdit,
  onOccurrences,
}) => {
  const router = useRouter();
  const displayBucket = categoryName || exp.poolName || exp.categoryName;
  const targetPoolId = exp.poolId || exp.categoryId;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEdit(exp)}
      activeOpacity={0.7}
    >
      {/* Row 1: Schedule Name + Recurrence Detail Text + Drawer Chevron */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {exp.name}
          </Text>
          <Text style={styles.freqText} numberOfLines={1}>
            • {formatScheduleDetail(exp.rrule, exp.startDate).detailText}
          </Text>
        </View>

        <CardDrawerIndicator size={16} color={DESIGN_TOKENS.colors.slate[400]} />
      </View>

      {/* Row 2: Entity Chip on Left, Amount on Right */}
      <View style={styles.detailRow}>
        <View style={styles.chipWrap}>
          {displayBucket && targetPoolId ? (
            <EntityLinkChip
              label={displayBucket}
              icon="folder"
              onPress={() => {
                router.push(`/(app)/pools/${targetPoolId}?returnTo=/(app)/paychecks` as Href);
              }}
            />
          ) : null}
        </View>

        <Text style={styles.amount}>−{formatAUD(exp.amount)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
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
    color: DESIGN_TOKENS.colors.slate[900],
    flexShrink: 1,
  },
  poolTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 1,
  },
  poolText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
    flexShrink: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  chipWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.critical,
    fontFamily: 'monospace',
  },
  freqText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
    flexShrink: 1,
  },
});
