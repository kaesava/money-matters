import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';

interface PoolSummaryCardProps {
  pool: {
    id: string;
    name: string;
    poolType: string;
    currentBalance?: number | string | null;
    isSurplusTarget?: boolean | null;
  };
  bankAccountName?: string | null;
  onMoveMoney: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export function PoolSummaryCard({
  pool,
  bankAccountName,
  onMoveMoney,
  onEdit,
  onArchive,
}: PoolSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.tagsRow}>
            <Text style={styles.poolTypeTag}>{pool.poolType}</Text>
            {pool.isSurplusTarget && (
              <View style={styles.surplusPill}>
                <Text style={styles.surplusPillText}>{t('categories.surplusBadgeText')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{pool.name}</Text>
          {bankAccountName && (
            <Text style={styles.bankNameMeta}>
              {t('categories.linkedAccount', { name: bankAccountName })}
            </Text>
          )}
        </View>

        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>{t('categories.currentBalance')}</Text>
          <Text style={styles.balanceAmount}>{formatAUD(pool.currentBalance ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onMoveMoney} style={styles.actionBtn}>
          <Feather name="repeat" size={14} color={DESIGN_TOKENS.colors.accent} />
          <Text style={styles.actionBtnText}>{t('dashboard.moveMoney')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <Feather name="edit-2" size={14} color="#64748B" />
          <Text style={[styles.actionBtnText, { color: '#64748B' }]}>{t('categories.editPool')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onArchive} style={styles.actionBtn}>
          <Feather name="archive" size={14} color="#94A3B8" />
          <Text style={[styles.actionBtnText, { color: '#94A3B8' }]}>{t('common.archive')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  poolTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  surplusPill: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  surplusPillText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  name: { fontSize: 18, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  bankNameMeta: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  balanceCol: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  balanceAmount: { fontSize: 20, fontWeight: '900', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.accent },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
});
