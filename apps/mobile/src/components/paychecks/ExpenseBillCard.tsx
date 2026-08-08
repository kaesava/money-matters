import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatScheduleDetail } from '../../lib/format';

interface ExpenseBillCardProps {
  exp: any;
  categoryName: string;
  onEdit: (exp: any) => void;
  onArchive: (exp: any) => void;
  onViewBurst: (exp: any) => void;
}

export const ExpenseBillCard: React.FC<ExpenseBillCardProps> = ({
  exp,
  categoryName,
  onEdit,
  onArchive,
  onViewBurst,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Feather name="arrow-up-right" size={12} color="#DC2626" />
            <Text style={[styles.badgeText, { color: '#DC2626' }]}>BILL</Text>
          </View>
          <Text style={styles.title}>{exp.name}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => onViewBurst(exp)} style={styles.iconBtn}>
            <Feather name="eye" size={16} color={DESIGN_TOKENS.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(exp)} style={styles.iconBtn}>
            <Feather name="edit-2" size={16} color={DESIGN_TOKENS.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onArchive(exp)} style={styles.iconBtn}>
            <Feather name="trash-2" size={16} color={DESIGN_TOKENS.colors.critical} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View>
          <Text style={styles.amount}>{formatAUD(exp.amount)}</Text>
          {categoryName ? <Text style={styles.categoryText}>Mapped to: {categoryName}</Text> : null}
        </View>
        <Text style={styles.freqText}>{formatScheduleDetail(exp.rrule, exp.startDate).detailText}</Text>
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
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  freqText: {
    fontSize: 12,
    color: '#64748B',
  },
});
