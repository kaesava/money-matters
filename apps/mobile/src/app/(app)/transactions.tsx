import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper, MobileFilterBar } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD, formatRelativeDate } from '../../lib/format';

type SortField = 'recordedAt' | 'amount' | 'categoryName';
type SortDir = 'asc' | 'desc';

export default function TransactionsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });
  const categoriesQuery = trpc.listCategories.useQuery();

  const transactions = (transactionsQuery.data as any[]) ?? [];
  const categories = categoriesQuery.data ?? [];

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [flowFilter, setFlowFilter] = useState('ALL');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('recordedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filter Logic
  const filtered = transactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim();
    if (
      q &&
      !tx.note?.toLowerCase().includes(q) &&
      !tx.categoryName?.toLowerCase().includes(q) &&
      !tx.amount.includes(q)
    ) {
      return false;
    }

    if (flowFilter !== 'ALL' && tx.flowType !== flowFilter) return false;

    if (categoryTypeFilter !== 'ALL') {
      const cat = categories.find((c) => c.id === tx.categoryId);
      if (!cat || cat.type !== categoryTypeFilter) return false;
    }

    return true;
  });

  // Sort Logic
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'recordedAt') {
      comparison = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
    } else if (sortField === 'amount') {
      comparison = parseFloat(a.amount) - parseFloat(b.amount);
    } else if (sortField === 'categoryName') {
      comparison = (a.categoryName || '').localeCompare(b.categoryName || '');
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  // CSV Export
  const handleExportCsv = async () => {
    if (sorted.length === 0) return;
    const headers = ['Date', 'Category', 'Flow', 'Amount', 'Source', 'Note'];
    const rows = sorted.map((tx) => [
      `"${new Date(tx.recordedAt).toISOString().split('T')[0]}"`,
      `"${tx.categoryName || 'Uncategorized'}"`,
      `"${tx.flowType}"`,
      `"${tx.amount}"`,
      `"${tx.source || 'MANUAL'}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    try {
      await Share.share({
        message: csvContent,
        title: `transactions_export_${new Date().toISOString().split('T')[0]}.csv`,
      });
    } catch (err) {
      Alert.alert('Export Error', err instanceof Error ? err.message : String(err));
    }
  };

  const D = DESIGN_TOKENS;

  return (
    <MobileScreenWrapper
      title={t('transactions.title', { defaultValue: 'Transactions' })}
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <View style={styles.container}>
        {/* Header Export Bar */}
        <View style={styles.headerRow}>
          <Text style={styles.subtext}>Audit ledger debits & credits ({sorted.length})</Text>
          <TouchableOpacity
            onPress={handleExportCsv}
            disabled={sorted.length === 0}
            style={[styles.exportBtn, sorted.length === 0 && styles.disabledBtn]}
            activeOpacity={0.8}
          >
            <Feather name="download" size={14} color="#FFF" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        <MobileFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search note, category, amount..."
          filterGroups={[
            {
              label: 'Flow',
              value: flowFilter,
              onChange: setFlowFilter,
              options: [
                { id: 'ALL', label: 'All' },
                { id: 'DEBIT', label: 'Debits (-)' },
                { id: 'CREDIT', label: 'Credits (+)' },
              ],
            },
            {
              label: 'Type',
              value: categoryTypeFilter,
              onChange: setCategoryTypeFilter,
              options: [
                { id: 'ALL', label: 'All' },
                { id: 'EVERYDAY', label: 'Everyday' },
                { id: 'REGULAR', label: 'Regular Bills' },
                { id: 'GOAL', label: 'Save Toward' },
              ],
            },
          ]}
          onClearAll={() => {
            setSearchQuery('');
            setFlowFilter('ALL');
            setCategoryTypeFilter('ALL');
          }}
        />

        {/* Sort Chips */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort By:</Text>
          {(['recordedAt', 'amount', 'categoryName'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => toggleSort(f)}
              style={[styles.sortChip, sortField === f && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sortField === f && styles.sortChipTextActive]}>
                {f === 'recordedAt' ? 'DATE' : f === 'amount' ? 'AMOUNT' : 'CATEGORY'}{' '}
                {sortField === f ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {transactionsQuery.isLoading ? (
          <ActivityIndicator color={D.colors.accent} style={{ marginTop: 40 }} />
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyTitle}>{t('transactions.empty', { defaultValue: 'No matching transactions found' })}</Text>
            <Text style={styles.emptySubtitle}>Adjust your search or filter settings.</Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isDebit = item.flowType === 'DEBIT';
              return (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        onPress={() => router.push('/(app)/categories' as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.catName}>{item.categoryName || 'Uncategorized'} 🔗</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateText}>
                        {new Date(item.recordedAt).toLocaleString('en-AU', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[styles.amountText, { color: isDebit ? '#EF4444' : '#10B981' }]}>
                        {isDebit ? '-' : '+'}{formatAUD(item.amount)}
                      </Text>

                      <View style={styles.badgeRow}>
                        <View style={[styles.flowBadge, { backgroundColor: isDebit ? '#FEE2E2' : '#D1FAE5' }]}>
                          <Text style={[styles.flowBadgeText, { color: isDebit ? '#991B1B' : '#065F46' }]}>
                            {isDebit ? 'DEBIT' : 'CREDIT'}
                          </Text>
                        </View>
                        <View style={styles.sourceBadge}>
                          <Text style={styles.sourceBadgeText}>{item.source || 'MANUAL'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {item.note ? <Text style={styles.noteText}>Note: {item.note}</Text> : null}
                </View>
              );
            }}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flex: 1, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtext: { fontSize: 11, color: D.colors.textMuted, fontWeight: '600' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: D.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  exportBtnText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  disabledBtn: { opacity: 0.5 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: 10, fontWeight: '700', color: D.colors.textMuted, textTransform: 'uppercase' },
  sortChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  sortChipActive: { backgroundColor: '#1B2B4B' },
  sortChipText: { fontSize: 10, fontWeight: '700', color: D.colors.textMuted },
  sortChipTextActive: { color: '#FFF' },
  list: { paddingBottom: 100, gap: 8 },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 14, fontWeight: '700', color: '#00B4A6' },
  dateText: { fontSize: 10, color: D.colors.textMuted, marginTop: 2 },
  amountText: { fontSize: 15, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: 4 },
  flowBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  flowBadgeText: { fontSize: 9, fontWeight: '800' },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#F3F4F6' },
  sourceBadgeText: { fontSize: 9, fontWeight: '800', color: D.colors.textMuted },
  noteText: { fontSize: 11, color: D.colors.textPrimary, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: D.colors.textPrimary },
  emptySubtitle: { fontSize: 12, color: D.colors.textMuted },
});
