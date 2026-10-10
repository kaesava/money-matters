import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CardDrawerIndicator, EntityLinkChip, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatScheduleDetail } from '../../lib/format';

export interface IncomeSourceItem {
  id: string;
  name: string;
  amount: string;
  rrule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  receivingAccountId?: string | null;
  accountName?: string | null;
}

interface IncomeSourceCardProps {
  inc: IncomeSourceItem;
  onEdit: (inc: IncomeSourceItem) => void;
  onOccurrences?: (inc: IncomeSourceItem) => void;
}

export const IncomeSourceCard: React.FC<IncomeSourceCardProps> = ({
  inc,
  onEdit,
  onOccurrences,
}) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEdit(inc)}
      activeOpacity={0.7}
    >
      {/* Row 1: Schedule Name + Recurrence Detail Text + Drawer Chevron */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {inc.name}
          </Text>
          <Text style={styles.freqText} numberOfLines={1}>
            • {formatScheduleDetail(inc.rrule, inc.startDate).detailText}
          </Text>
        </View>

        <CardDrawerIndicator size={16} color={DESIGN_TOKENS.colors.slate[400]} />
      </View>

      {/* Row 2: Entity Chip on Left, Amount on Right */}
      <View style={styles.detailRow}>
        <View style={styles.chipWrap}>
          {inc.accountName ? (
            <EntityLinkChip
              label={inc.accountName}
              icon="credit-card"
              onPress={() => {
                const idParam = inc.receivingAccountId ? `&id=${inc.receivingAccountId}` : '';
                router.push(`/(app)/settings?tab=bank-accounts${idParam}&returnTo=/(app)/paychecks` as Href);
              }}
            />
          ) : null}
        </View>

        <Text style={styles.amount}>+{formatAUD(inc.amount)}</Text>
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
  accountTag: {
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
  accountText: {
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
    color: DESIGN_TOKENS.colors.success,
    fontFamily: 'monospace',
  },
  freqText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
    flexShrink: 1,
  },
});
