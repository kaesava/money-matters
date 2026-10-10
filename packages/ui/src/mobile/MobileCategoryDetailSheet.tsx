import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog, SegmentedTabs } from './index.js';
import { t } from '@money-matters/i18n';

export interface MobileCategoryDetailItem {
  id: string;
  name: string;
  amount: number | string;
  dueDate?: string;
  status?: string;
}

export interface MobileSubcategoryItem {
  id: string;
  name: string;
  targetAmount: number | string;
}

export interface MobileActivityItem {
  id: string;
  description: string;
  amount: number | string;
  date: string;
  type?: 'DEBIT' | 'CREDIT';
}

export interface MobileCategoryDetailSheetProps {
  visible: boolean;
  poolId?: string | null;
  poolName: string;
  poolType?: string;
  currentBalance?: number | string | null;
  targetAmount?: number | string | null;
  targetDate?: string | null;
  subcategories?: MobileSubcategoryItem[];
  upcomingEvents?: MobileCategoryDetailItem[];
  activities?: MobileActivityItem[];
  onClose: () => void;
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
}

function fmtMoney(val: number | string | undefined | null): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MobileCategoryDetailSheet({
  visible,
  poolName,
  poolType,
  currentBalance,
  targetAmount,
  targetDate,
  subcategories = [],
  upcomingEvents = [],
  activities = [],
  onClose,
  onMarkPaid,
}: MobileCategoryDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'UPCOMING' | 'ACTIVITY'>('CATEGORIES');

  if (!visible) return null;

  const balNum = typeof currentBalance === 'number' ? currentBalance : parseFloat(String(currentBalance || '0'));
  const targetNum = typeof targetAmount === 'number' ? targetAmount : parseFloat(String(targetAmount || '0'));

  const tabs = [
    { key: 'CATEGORIES' as const, label: t('categoryDrawer.tabs.categories') },
    { key: 'UPCOMING' as const, label: `${t('categoryDrawer.tabs.upcomingExpenses')} (${upcomingEvents.length})` },
    { key: 'ACTIVITY' as const, label: t('categoryDrawer.tabs.history') },
  ];

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={poolName}
      subtitle={poolType ? t(`poolTypes.${poolType.toLowerCase()}`) : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Balance & Target Stat Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('paydayDrawer.tableColBalance')}</Text>
            <Text style={styles.statAmount}>{fmtMoney(balNum)}</Text>
          </View>

          {targetNum > 0 && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t('paydayDrawer.tableColTarget')}</Text>
              <Text style={styles.statAmount}>{fmtMoney(targetNum)}</Text>
              {targetDate && <Text style={styles.targetDateText}>{targetDate}</Text>}
            </View>
          )}
        </View>

        {/* 3-Tab Selector */}
        <SegmentedTabs<'CATEGORIES' | 'UPCOMING' | 'ACTIVITY'>
          tabs={tabs}
          activeKey={activeTab}
          onChange={(tabKey) => setActiveTab(tabKey)}
        />

        {/* Tab 1: Subcategories */}
        {activeTab === 'CATEGORIES' && (
          <View style={styles.tabContent}>
            {subcategories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('categoryDrawer.noCategories')}</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {subcategories.map((cat) => (
                  <View key={cat.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{cat.name}</Text>
                    <Text style={styles.itemAmount}>{fmtMoney(cat.targetAmount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab 2: Upcoming with Mark Paid */}
        {activeTab === 'UPCOMING' && (
          <View style={styles.tabContent}>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('categoryDrawer.noExpenses')}</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {upcomingEvents.map((evt) => (
                  <View key={evt.id} style={styles.eventCard}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.itemTitle}>{evt.name}</Text>
                      {evt.dueDate && <Text style={styles.itemSubtitle}>{evt.dueDate}</Text>}
                    </View>
                    <View style={styles.eventRight}>
                      <Text style={styles.itemAmount}>{fmtMoney(evt.amount)}</Text>
                      {onMarkPaid && (
                        <TouchableOpacity
                          style={styles.markPaidBtn}
                          onPress={() => onMarkPaid(evt.id, String(evt.amount), evt.dueDate || '')}
                        >
                          <Feather name="check" size={12} color="#FFFFFF" />
                          <Text style={styles.markPaidText}>{t('categoryDrawer.markPaid')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab 3: Activity Ledger */}
        {activeTab === 'ACTIVITY' && (
          <View style={styles.tabContent}>
            {activities.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('categoryDrawer.noTransactions')}</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {activities.map((act) => (
                  <View key={act.id} style={styles.listItem}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.itemTitle}>{act.description}</Text>
                      <Text style={styles.itemSubtitle}>{act.date}</Text>
                    </View>
                    <Text
                      style={[
                        styles.itemAmount,
                        act.type === 'CREDIT' ? styles.creditAmount : styles.debitAmount,
                      ]}
                    >
                      {act.type === 'CREDIT' ? '+' : '-'}{fmtMoney(act.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  statLabel: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    fontFamily: 'monospace',
  },
  targetDateText: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 2,
  },
  tabContent: {
    marginTop: 4,
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  itemSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    fontFamily: 'monospace',
  },
  creditAmount: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  debitAmount: {
    color: DESIGN_TOKENS.colors.burnRed,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  markPaidText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
