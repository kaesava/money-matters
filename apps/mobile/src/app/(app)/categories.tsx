import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper, MobileFilterBar, MobilePaginationBar } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

import { CategoryFormModal } from '../../components/CategoryFormModal';
import { MoveMoneyModal } from '../../components/MoveMoneyModal';

type SortField = 'name' | 'type' | 'balance' | 'health';
type SortDir = 'asc' | 'desc';

function pct(balance: string, target: string | null) {
  const balanceNum = parseFloat(balance);
  const targetNum = target ? parseFloat(target) : null;
  if (!targetNum || targetNum === 0) return null;
  return Math.min(Math.round((balanceNum / targetNum) * 100), 100);
}

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ health?: string; search?: string }>();

  const { data: session } = authClient.useSession();
  const { data: categories = [], isLoading, error, refetch } = trpc.listCategories.useQuery();

  // Filters & Sorting State
  const [searchQuery, setSearchQuery] = useState(params.search ?? '');

  React.useEffect(() => {
    if (params.search !== undefined) {
      setSearchQuery(params.search);
    }
  }, [params.search]);

  const [healthFilter, setHealthFilter] = useState<string>(params.health ?? 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  React.useEffect(() => {
    if (params.health !== undefined) {
      setHealthFilter(params.health);
    }
  }, [params.health]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, healthFilter, typeFilter, sortField, sortDir, pageSize]);

  // Modals
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);

  const archiveMut = trpc.archiveCategory.useMutation({
    onSuccess: () => refetch(),
  });

  const handleArchive = (cat: any) => {
    if (cat.type === 'EVERYDAY') {
      Alert.alert('Archive Locked', 'The Everyday category cannot be archived or deleted.');
      return;
    }
    Alert.alert('Archive Category', `Are you sure you want to archive "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveMut.mutateAsync({ categoryId: cat.id });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Filter & Sort Logic
  const filtered = categories.filter((c) => {
    if (!c) return false;
    const q = searchQuery.toLowerCase().trim();
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (healthFilter !== 'ALL' && c.healthStatus !== healthFilter) return false;
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a: any, b: any) => {
    let comparison = 0;
    if (sortField === 'name') comparison = a.name.localeCompare(b.name);
    else if (sortField === 'type') comparison = a.type.localeCompare(b.type);
    else if (sortField === 'balance') comparison = parseFloat(a.currentBalance) - parseFloat(b.currentBalance);
    else if (sortField === 'health') {
      const order = { RED: 0, AMBER: 1, GREEN: 2 };
      comparison = (order[a.healthStatus as keyof typeof order] ?? 1) - (order[b.healthStatus as keyof typeof order] ?? 1);
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const onTrackCount = categories.filter((c) => c?.healthStatus === 'GREEN').length;
  const needsAttentionCount = categories.filter((c) => c?.healthStatus === 'AMBER').length;
  const behindCount = categories.filter((c) => c?.healthStatus === 'RED').length;

  const D = DESIGN_TOKENS;

  return (
    <View style={{ flex: 1 }}>
      <MobileScreenWrapper
        title={t('categories.title')}
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateCategories={() => router.push('/(app)/categories')}
        onNavigateSettings={() => router.push('/(app)/settings')}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 14 }}>
          {/* Header Action Controls */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setMoveMoneyVisible(true)}
              style={styles.moveMoneyHeaderBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.moveMoneyHeaderBtnText}>↔️ Move Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setCategoryToEdit(null);
                setCategoryFormVisible(true);
              }}
              style={styles.newCategoryHeaderBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.newCategoryHeaderBtnText}>➕ New Category</Text>
            </TouchableOpacity>
          </View>

          {/* Top Health Counters */}
          <View style={styles.grid2x2}>
            <TouchableOpacity
              onPress={() => setHealthFilter('ALL')}
              style={[
                styles.statChip,
                healthFilter === 'ALL' && { backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#64748B' },
              ]}
            >
              <Text style={styles.statChipLabel}>TOTAL</Text>
              <Text style={styles.statChipVal}>{categories.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHealthFilter('GREEN')}
              style={[
                styles.statChip,
                { borderColor: '#A7F3D0' },
                healthFilter === 'GREEN' && { backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: '#10B981' },
              ]}
            >
              <Text style={[styles.statChipLabel, { color: '#059669' }]}>ON TRACK</Text>
              <Text style={[styles.statChipVal, { color: '#059669' }]}>{onTrackCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHealthFilter('AMBER')}
              style={[
                styles.statChip,
                { borderColor: '#FDE68A' },
                healthFilter === 'AMBER' && { backgroundColor: '#FFFBEB', borderWidth: 2, borderColor: '#F59E0B' },
              ]}
            >
              <Text style={[styles.statChipLabel, { color: '#D97706' }]}>NEEDS ATTENTION</Text>
              <Text style={[styles.statChipVal, { color: '#D97706' }]}>{needsAttentionCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHealthFilter('RED')}
              style={[
                styles.statChip,
                { borderColor: '#FECDD3' },
                healthFilter === 'RED' && { backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#EF4444' },
              ]}
            >
              <Text style={[styles.statChipLabel, { color: '#E11D48' }]}>BEHIND</Text>
              <Text style={[styles.statChipVal, { color: '#E11D48' }]}>{behindCount}</Text>
            </TouchableOpacity>
          </View>

          {/* Search, Filter & Sort Bar */}
          <MobileFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search category name..."
            filterGroups={[
              {
                label: 'Health',
                value: healthFilter,
                onChange: setHealthFilter,
                options: [
                  { id: 'ALL', label: 'All' },
                  { id: 'GREEN', label: 'On Track' },
                  { id: 'AMBER', label: 'Needs Attention' },
                  { id: 'RED', label: 'Behind' },
                ],
              },
              {
                label: 'Type',
                value: typeFilter,
                onChange: setTypeFilter,
                options: [
                  { id: 'ALL', label: 'All' },
                  { id: 'GOAL', label: 'Save Toward' },
                  { id: 'REGULAR', label: 'Regular Bills' },
                  { id: 'EVERYDAY', label: 'Everyday' },
                ],
              },
            ]}
            onClearAll={() => {
              setSearchQuery('');
              setHealthFilter('ALL');
              setTypeFilter('ALL');
            }}
          />

          {/* Sort Selector Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort By:</Text>
            {(['name', 'type', 'balance', 'health'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => toggleSort(f)}
                style={[styles.sortChip, sortField === f && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, sortField === f && styles.sortChipTextActive]}>
                  {f.toUpperCase()} {sortField === f ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isLoading && <ActivityIndicator color={D.colors.accent} style={{ marginTop: 40 }} />}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>{t('common.error', { defaultValue: 'Error' })}</Text>
              <Text style={styles.errorSubtitle}>{error.message}</Text>
            </View>
          )}

          {/* Categories List Cards */}
          {sorted.length === 0 ? (
            <Text style={styles.emptyText}>No matching categories found.</Text>
          ) : (
            <>
              {sorted.slice((page - 1) * pageSize, page * pageSize).map((cat: any) => {
                const p = pct(cat.currentBalance, cat.targetAmount);
                const color =
                  cat.healthStatus === 'GREEN' ? D.colors.success :
                  cat.healthStatus === 'AMBER' ? D.colors.warning :
                  cat.healthStatus === 'RED' ? D.colors.critical :
                  D.colors.accent;

                return (
                  <View key={cat.id} style={styles.card}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(app)/categories/${cat.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.catName} numberOfLines={1} ellipsizeMode="tail">{cat.name}</Text>
                        <Text style={[styles.catBalance, { color }]} numberOfLines={1}>{formatAUD(cat.currentBalance)}</Text>
                      </View>
                      {cat.targetAmount && (
                        <Text style={styles.target}>{t('categories.target')} {formatAUD(cat.targetAmount)}</Text>
                      )}
                      {p !== null && (
                        <>
                          <View style={styles.barBg}>
                            <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color }]} />
                          </View>
                          <Text style={[styles.pctLabel, { color }]}>{t('categories.progressPct', { pct: p })}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Actions Row */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setCategoryToEdit(cat);
                          setCategoryFormVisible(true);
                        }}
                        style={styles.actionBtn}
                      >
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>

                      {cat.type !== 'EVERYDAY' && (
                        <TouchableOpacity onPress={() => handleArchive(cat)} style={styles.archiveBtn}>
                          <Text style={styles.archiveBtnText}>Archive</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <MobilePaginationBar
                page={page}
                totalPages={Math.ceil(sorted.length / pageSize) || 1}
                pageSize={pageSize}
                totalItems={sorted.length}
                pageSizeOptions={[10, 20, 50]}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </ScrollView>
      </MobileScreenWrapper>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setCategoryToEdit(null);
          setCategoryFormVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Unified Category Form Modal */}
      <CategoryFormModal
        visible={categoryFormVisible}
        categoryToEdit={categoryToEdit}
        onClose={() => setCategoryFormVisible(false)}
        onSuccess={() => refetch()}
      />

      {/* Move Money Modal */}
      <MoveMoneyModal
        visible={moveMoneyVisible}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => refetch()}
      />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginVertical: 4 },
  moveMoneyHeaderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E0F2FE', alignItems: 'center' },
  moveMoneyHeaderBtnText: { fontSize: 12, fontWeight: '800', color: '#0369A1' },
  newCategoryHeaderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#00B4A6', alignItems: 'center' },
  newCategoryHeaderBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statChip: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  statChipLabel: { fontSize: 9, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5 },
  statChipVal: { fontSize: 18, fontWeight: '900', color: '#1B2B4B', marginTop: 2 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: 10, fontWeight: '700', color: D.colors.textMuted, textTransform: 'uppercase' },
  sortChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  sortChipActive: { backgroundColor: '#1B2B4B' },
  sortChipText: { fontSize: 10, fontWeight: '700', color: D.colors.textMuted },
  sortChipTextActive: { color: '#FFF' },
  emptyText: { textAlign: 'center', fontSize: 12, color: D.colors.textMuted, marginVertical: 20 },
  card: {
    backgroundColor: D.colors.surface, borderRadius: D.radius.lg,
    padding: D.spacing.cardPadding, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { fontSize: 15, fontWeight: '700', color: D.colors.textPrimary, flex: 1 },
  catBalance: { fontSize: 15, fontWeight: '800' },
  target: { fontSize: 11, color: D.colors.textMuted, marginBottom: 8 },
  barBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 5, borderRadius: 3 },
  pctLabel: { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: D.colors.textPrimary },
  archiveBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEE2E2' },
  archiveBtnText: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
  errorContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 15, fontWeight: '600', color: D.colors.textPrimary },
  errorSubtitle: { fontSize: 13, color: D.colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
