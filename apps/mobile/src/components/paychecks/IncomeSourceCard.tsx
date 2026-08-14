import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatScheduleDetail } from '../../lib/format';

export interface IncomeSourceItem {
  id: string;
  name: string;
  amount: string;
  rrule?: string | null;
  startDate?: string | null;
}

interface IncomeSourceCardProps {
  inc: IncomeSourceItem;
  onEdit: (inc: IncomeSourceItem) => void;
  onArchive: (inc: IncomeSourceItem) => void;
  onViewBurst: (inc: IncomeSourceItem) => void;
}

export const IncomeSourceCard: React.FC<IncomeSourceCardProps> = ({
  inc,
  onEdit,
  onArchive,
  onViewBurst,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <Feather name="arrow-down-left" size={12} color="#059669" />
            <Text style={[styles.badgeText, { color: '#059669' }]}>{t('badges.income')}</Text>
          </View>
          <Text style={styles.title}>{inc.name}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => onViewBurst(inc)} style={styles.iconBtn}>
            <Feather name="eye" size={16} color={DESIGN_TOKENS.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(inc)} style={styles.iconBtn}>
            <Feather name="edit-2" size={16} color={DESIGN_TOKENS.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onArchive(inc)} style={styles.iconBtn}>
            <Feather name="trash-2" size={16} color={DESIGN_TOKENS.colors.critical} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.amount}>{formatAUD(inc.amount)}</Text>
        <Text style={styles.freqText}>{formatScheduleDetail(inc.rrule, inc.startDate).detailText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
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
  },
  freqText: {
    fontSize: 12,
    color: '#64748B',
  },
});
