import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
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
  const posthog = usePostHog();
  const params = useLocalSearchParams<{ health?: string; search?: string }>();

  const { data: session } = authClient.useSession();
  const { data: categories = [], isLoading, error, refetch } = trpc.listCategories.useQuery();

  // Filters State
  const [searchQuery, setSearchQuery] = useState(params.search ?? '');

  React.useEffect(() => {
    if (params.search !== undefined) {
      setSearchQuery(params.search);
    }
  }, [params.search]);

  const [healthFilter, setHealthFilter] = useState<string>(params.health ?? 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Section Collapse State
  const [isEverydayCollapsed, setIsEverydayCollapsed] = useState(true);
  const [isRegularCollapsed, setIsRegularCollapsed] = useState(true);

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
            posthog.capture('category_archived', { category_type: cat.type });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  // Bucket Filtering & Aggregations
  const everydayCats = categories.filter((c) => c?.type === 'EVERYDAY');
  const regularCats = categories.filter((c) => c?.type === 'REGULAR');
  const goalCats = categories.filter((c) => c?.type === 'GOAL');

  const everydayBalance = everydayCats.reduce((sum, c) => sum + parseFloat(c?.currentBalance || '0'), 0);
  const everydayBudget = everydayCats.reduce((sum, c) => sum + parseFloat(c?.everydayAllowanceAmount || c?.monthlyAmount || '0'), 0);

  const regularBalance = regularCats.reduce((sum, c) => sum + parseFloat(c?.currentBalance || '0'), 0);
  const regularBudget = regularCats.reduce((sum, c) => sum + parseFloat(c?.monthlyAmount || '0'), 0);

  const filterFn = (list: any[]) =>
    list.filter((c) => {
      if (!c) return false;
      const q = searchQuery.toLowerCase().trim();
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (healthFilter !== 'ALL' && c.healthStatus !== healthFilter) return false;
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      return true;
    });

  const filteredEveryday = filterFn(everydayCats);
  const filteredRegular = filterFn(regularCats);
  const filteredGoal = filterFn(goalCats);

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

          {/* Search & Filter Bar */}
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
            ]}
            onClearAll={() => {
              setSearchQuery('');
              setHealthFilter('ALL');
            }}
          />

          {isLoading && <ActivityIndicator color={D.colors.accent} style={{ marginTop: 20 }} />}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>{t('common.error', { defaultValue: 'Error' })}</Text>
              <Text style={styles.errorSubtitle}>{error.message}</Text>
            </View>
          )}

          {/* SECTION 1: EVERYDAY SPENDING (COLLAPSABLE) */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsEverydayCollapsed(!isEverydayCollapsed)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>💳 Everyday Spending</Text>
                <Text style={styles.sectionSubtitle}>Overall Everyday Pool Balance</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                <Text style={styles.sectionBalance}>{formatAUD(everydayBalance)}</Text>
                <Text style={styles.sectionBudget}>Target: {formatAUD(everydayBudget)}</Text>
              </View>
              <Feather name={isEverydayCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color="#64748B" />
            </TouchableOpacity>

            {!isEverydayCollapsed && (
              <View style={styles.sectionContent}>
                {filteredEveryday.length === 0 ? (
                  <Text style={styles.emptyText}>No Everyday categories found.</Text>
                ) : (
                  filteredEveryday.map((cat: any) => (
                    <View key={cat.id} style={styles.itemRow}>
                      <TouchableOpacity
                        onPress={() => router.push(`/(app)/categories/${cat.id}` as any)}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.itemName}>{cat.name}</Text>
                        <Text style={styles.itemPoolBadge}>Managed at overall pool level</Text>
                      </TouchableOpacity>

                      <Text style={styles.itemTarget}>{formatAUD(cat.everydayAllowanceAmount || cat.monthlyAmount || 0)}/mo</Text>

                      <TouchableOpacity
                        onPress={() => {
                          setCategoryToEdit(cat);
                          setCategoryFormVisible(true);
                        }}
                        style={styles.actionBtn}
                      >
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>

          {/* SECTION 2: REGULAR BILLS (COLLAPSABLE) */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsRegularCollapsed(!isRegularCollapsed)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>🧾 Regular Bills</Text>
                <Text style={styles.sectionSubtitle}>Overall Bills Pool Balance</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                <Text style={styles.sectionBalance}>{formatAUD(regularBalance)}</Text>
                <Text style={styles.sectionBudget}>Target: {formatAUD(regularBudget)}</Text>
              </View>
              <Feather name={isRegularCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color="#64748B" />
            </TouchableOpacity>

            {!isRegularCollapsed && (
              <View style={styles.sectionContent}>
                {filteredRegular.length === 0 ? (
                  <Text style={styles.emptyText}>No Regular bill categories found.</Text>
                ) : (
                  filteredRegular.map((cat: any) => (
                    <View key={cat.id} style={styles.itemRow}>
                      <TouchableOpacity
                        onPress={() => router.push(`/(app)/categories/${cat.id}` as any)}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.itemName}>{cat.name}</Text>
                        <Text style={styles.itemPoolBadge}>Managed at overall pool level</Text>
                      </TouchableOpacity>

                      <Text style={styles.itemTarget}>{formatAUD(cat.monthlyAmount || 0)}/mo</Text>

                      <TouchableOpacity
                        onPress={() => {
                          setCategoryToEdit(cat);
                          setCategoryFormVisible(true);
                        }}
                        style={styles.actionBtn}
                      >
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleArchive(cat)} style={styles.archiveBtn}>
                        <Text style={styles.archiveBtnText}>Archive</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>

          {/* SECTION 3: SAVE TOWARD (GOALS) */}
          <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderNoToggle}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>🎯 Save Toward (Goals)</Text>
                  <Text style={styles.sectionSubtitle}>Dedicated Target Pools ({goalCats.length})</Text>
                </View>
              </View>

              <View style={styles.sectionContent}>
                {filteredGoal.length === 0 ? (
                  <Text style={styles.emptyText}>No savings goals found.</Text>
                ) : (
                  filteredGoal.map((cat: any) => {
                    const p = pct(cat.currentBalance, cat.targetAmount);
                    const color =
                      cat.healthStatus === 'GREEN' ? D.colors.success :
                      cat.healthStatus === 'AMBER' ? D.colors.warning :
                      cat.healthStatus === 'RED' ? D.colors.critical :
                      D.colors.accent;

                    return (
                      <View key={cat.id} style={styles.goalCardItem}>
                        <TouchableOpacity
                          onPress={() => router.push(`/(app)/categories/${cat.id}` as any)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cardHeader}>
                            <Text style={styles.catName}>{cat.name}</Text>
                            <Text style={[styles.catBalance, { color }]}>{formatAUD(cat.currentBalance)}</Text>
                          </View>
                          {cat.targetAmount && (
                            <Text style={styles.target}>Target: {formatAUD(cat.targetAmount)}</Text>
                          )}
                          {p !== null && (
                            <>
                              <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color }]} />
                              </View>
                              <Text style={[styles.pctLabel, { color }]}>{p}% saved</Text>
                            </>
                          )}
                        </TouchableOpacity>

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

                          <TouchableOpacity onPress={() => handleArchive(cat)} style={styles.archiveBtn}>
                            <Text style={styles.archiveBtnText}>Archive</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
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

      {/* Category Form Modal */}
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
  emptyText: { textAlign: 'center', fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginVertical: 12 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionHeaderNoToggle: { padding: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1B2B4B' },
  sectionSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sectionBalance: { fontSize: 15, fontWeight: '900', color: '#1B2B4B' },
  sectionBudget: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  sectionContent: { padding: 12, gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1B2B4B' },
  itemPoolBadge: { fontSize: 9, fontWeight: '600', color: '#94A3B8' },
  itemTarget: { fontSize: 12, fontWeight: '800', color: '#475569' },
  goalCardItem: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catName: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary, flex: 1 },
  catBalance: { fontSize: 14, fontWeight: '800' },
  target: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 6 },
  barBg: { height: 5, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 5, borderRadius: 3 },
  pctLabel: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  archiveBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEE2E2' },
  archiveBtnText: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
  errorContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 15, fontWeight: '600', color: DESIGN_TOKENS.colors.textPrimary },
  errorSubtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center' },
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
