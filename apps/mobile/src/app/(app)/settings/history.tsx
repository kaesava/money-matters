import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../../lib/format';

export default function MobileHistoryScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500 });
  const categoriesQuery = trpc.listCategories.useQuery();

  interface TransactionItem {
    id: string;
    recordedAt: string | Date;
    categoryId: string;
    categoryName?: string;
    amount: string;
    flowType: 'DEBIT' | 'CREDIT';
    source?: string;
    note?: string | null;
  }

  const transactions = (transactionsQuery.data as TransactionItem[]) ?? [];
  const categories = categoriesQuery.data ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'ALL' | 'EVERYDAY' | 'REGULAR' | 'GOAL'>('ALL');

  const filtered = transactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !tx.note?.toLowerCase().includes(q) && !tx.categoryName?.toLowerCase().includes(q) && !tx.amount.includes(q)) {
      return false;
    }
    if (flowFilter !== 'ALL' && tx.flowType !== flowFilter) return false;
    if (categoryTypeFilter !== 'ALL') {
      const cat = categories.find((c) => c.id === tx.categoryId);
      if (!cat || cat.type !== categoryTypeFilter) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const handleExportCsv = async () => {
    if (sorted.length === 0) return;
    const headers = ['Date', 'Bucket', 'Flow', 'Amount', 'Source', 'What for'];
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
      await Share.share({ title: 'Transaction History CSV', message: csvContent });
    } catch {}
  };

  return (
    <MobileScreenWrapper
      title={t('transactions.title')}
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={16} color={DESIGN_TOKENS.colors.textMuted} />
          <Text style={styles.backBtnText}>Back to Settings</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('transactions.title')}</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
            <Feather name="download" size={14} color={DESIGN_TOKENS.colors.primary} />
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search note, bucket, amount..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filterRow}>
          {(['ALL', 'DEBIT', 'CREDIT'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, flowFilter === f && styles.filterChipActive]}
              onPress={() => setFlowFilter(f)}
            >
              <Text style={[styles.filterChipText, flowFilter === f && styles.filterChipTextActive]}>
                {f === 'ALL' ? 'All' : f === 'DEBIT' ? 'Spent (−)' : 'Income (+)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {transactionsQuery.isLoading ? (
          <Text style={styles.emptyText}>Loading history...</Text>
        ) : sorted.length === 0 ? (
          <Text style={styles.emptyText}>{t('transactions.empty')}</Text>
        ) : (
          sorted.map((tx) => {
            const isDebit = tx.flowType === 'DEBIT';
            return (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txMain}>
                  <Text style={styles.txCategory}>{tx.categoryName || 'Uncategorized'}</Text>
                  <Text style={[styles.txAmount, isDebit ? styles.debitText : styles.creditText]}>
                    {isDebit ? '-' : '+'}{formatAUD(parseFloat(tx.amount))}
                  </Text>
                </View>
                <View style={styles.txSub}>
                  <Text style={styles.txDate}>
                    {new Date(tx.recordedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </Text>
                  {tx.note ? <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text> : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: DESIGN_TOKENS.spacing.containerMargin, paddingBottom: 80 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backBtnText: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, fontWeight: '500' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  searchInput: { backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: DESIGN_TOKENS.colors.surfaceVariant },
  filterChipActive: { backgroundColor: DESIGN_TOKENS.colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.textMuted },
  filterChipTextActive: { color: '#FFFFFF' },
  emptyText: { textAlign: 'center', fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, marginVertical: 24 },
  txCard: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, marginBottom: 8 },
  txMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txCategory: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  txAmount: { fontSize: 14, fontWeight: '700' },
  debitText: { color: DESIGN_TOKENS.colors.critical },
  creditText: { color: DESIGN_TOKENS.colors.success },
  txSub: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  txDate: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted },
  txNote: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, maxWidth: '60%' },
});
