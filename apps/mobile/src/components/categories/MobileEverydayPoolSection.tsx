import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { monthProgress } from '@money-matters/ui';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

import { CategoryItem } from '../CategoryFormModal';
import { InfoTooltip } from '../InfoTooltip';

export type MobileCategoryItem = CategoryItem;

interface MobileEverydayPoolSectionProps {
  categories: CategoryItem[];

  everydayBalance: number;
  everydayBudget: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEditCategory: (cat: MobileCategoryItem) => void;
}

export function MobileEverydayPoolSection({
  categories,
  everydayBalance,
  everydayBudget,
  isCollapsed,
  onToggleCollapse,
  onEditCategory,
}: MobileEverydayPoolSectionProps) {
  const router = useRouter();
  const spentPct =
    everydayBudget > 0
      ? Math.min(100, Math.max(0, Math.round(((everydayBudget - everydayBalance) / everydayBudget) * 100)))
      : 0;
  const elapsedPct = monthProgress().elapsedPct;
  const pacingColor = spentPct > elapsedPct + 15 ? '#ba1a1a' : spentPct > elapsedPct + 5 ? '#f59e0b' : '#22c55e';

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggleCollapse} activeOpacity={0.8}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>💳 Everyday Spending</Text>
          <InfoTooltip title="Everyday Pool" content="Discretionary funds. Budgets set overall target; spent directly from overall Everyday pool." />
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          <Text style={styles.sectionBalance}>{formatAUD(everydayBalance)}</Text>
          <Text style={styles.sectionBudget}>Target: {formatAUD(everydayBudget)}</Text>
        </View>
        <Feather name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color="#64748B" />
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748B' }}>Pacing Progress</Text>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748B' }}>
            Spent: {spentPct}% | Month: {elapsedPct}%
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', gap: 1 }}>
          <View style={{ height: 2, width: `${elapsedPct}%`, backgroundColor: '#2563eb', borderRadius: 1 }} />
          <View style={{ height: 3, width: `${spentPct}%`, backgroundColor: pacingColor, borderRadius: 1.5 }} />
        </View>
      </View>

      {!isCollapsed && (
        <View style={styles.sectionContent}>
          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No Everyday categories found.</Text>
          ) : (
            categories.map((cat) => (
              <View key={cat.id} style={styles.itemRow}>
                <TouchableOpacity
                  onPress={() => router.push(`/(app)/categories/${cat.id}` as Href)}
                  style={{ flex: 1 }}
                >
                  <Text style={styles.itemName}>{cat.name}</Text>
                  <Text style={styles.itemPoolBadge}>Managed at overall pool level</Text>
                </TouchableOpacity>

                <Text style={styles.itemTarget}>
                  {formatAUD(cat.everydayAllowanceAmount || cat.monthlyAmount || 0)}/mo
                </Text>

                <TouchableOpacity onPress={() => onEditCategory(cat)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  sectionBalance: {
    fontSize: 15,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: '#1B2B4B',
  },
  sectionBudget: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#64748B',
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B4A6',
  },
  itemPoolBadge: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
  },
  itemTarget: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#334155',
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
