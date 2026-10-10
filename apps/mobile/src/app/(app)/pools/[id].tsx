import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MobileScreenWrapper, showMobileConfirm, MobileFilterSheet, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { CategoryItemModal, CategoryItemToEdit } from '../../../components/CategoryItemModal';
import { CategoryFormModal } from '../../../components/CategoryFormModal';
import { QuickExpenseModal } from '../../../components/QuickExpenseModal';
import { MarkPaidModal, MarkPaidEvent } from '../../../components/MarkPaidModal';
import { PoolSummaryCard } from '../../../components/pools/PoolSummaryCard';
import { PoolCategoriesSection } from '../../../components/pools/PoolCategoriesSection';
import { PoolUpcomingSection } from '../../../components/pools/PoolUpcomingSection';
import { PoolHistorySection } from '../../../components/pools/PoolHistorySection';

export default function PoolDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [selectedCatForEdit, setSelectedCatForEdit] = useState<CategoryItemToEdit | null>(null);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catSortField, setCatSortField] = useState<'name' | 'amount'>('name');
  const [catSortDir, setCatSortDir] = useState<'asc' | 'desc'>('asc');
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [catFilterSheetVisible, setCatFilterSheetVisible] = useState(false);
  const [catPriorityFilter, setCatPriorityFilter] = useState<'ALL' | 'PRIORITISED' | 'REGULAR'>('ALL');

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const txLedgerQuery = trpc.listTransactions.useQuery({ poolId: id, limit: 10 }, { enabled: !!session?.user && !!id });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: !!session?.user && !!id });

  const archivePoolMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      router.back();
    },
  });

  const pool = poolsQuery.data?.find((p) => p.id === id);
  const poolCategories = (categoriesQuery.data ?? []).filter((c) => c.poolId === id);
  const bankAccount = bankAccountsQuery.data?.find((b) => b.id === pool?.bankAccountId);

  const upcomingExpenses = useMemo(() => {
    const poolCatIds = new Set(poolCategories.map((c) => c.id));
    return (expenseEventsQuery.data ?? [])
      .filter((e) => e.status !== 'CONFIRMED' && (e.poolId === id || (e.categoryId && poolCatIds.has(e.categoryId))))
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  }, [expenseEventsQuery.data, id, poolCategories]);

  const filteredCategories = useMemo(() => {
    return poolCategories
      .filter((c) => {
        if (catPriorityFilter === 'PRIORITISED' && !c.isEssential) return false;
        if (catPriorityFilter === 'REGULAR' && c.isEssential) return false;
        if (!catSearchQuery.trim()) return true;
        return c.name.toLowerCase().includes(catSearchQuery.toLowerCase().trim());
      })
      .sort((a, b) => {
        if (catSortField === 'name') {
          const res = a.name.localeCompare(b.name);
          return catSortDir === 'asc' ? res : -res;
        }
        const aAmt = parseFloat(a.monthlyAmount || a.enteredAmount || '0');
        const bAmt = parseFloat(b.monthlyAmount || b.enteredAmount || '0');
        return catSortDir === 'asc' ? aAmt - bAmt : bAmt - aAmt;
      });
  }, [poolCategories, catSearchQuery, catSortField, catSortDir, catPriorityFilter]);

  if (poolsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
      </View>
    );
  }

  const handleBack = () => {
    if (returnTo) router.push(returnTo as never);
    else router.back();
  };

  if (!pool) {
    return (
      <MobileScreenWrapper title={t('categories.poolNotFound')} showBack onBackPress={handleBack}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('categories.poolNotFound')}</Text>
        </View>
      </MobileScreenWrapper>
    );
  }

  return (
    <MobileScreenWrapper title={pool.name} user={session?.user} showBack onBackPress={handleBack}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PoolSummaryCard
          pool={pool}
          bankAccountName={bankAccount?.name}
          onMoveMoney={() => setMoveMoneyVisible(true)}
          onEdit={() => setPoolModalVisible(true)}
          onArchive={() => {
            showMobileConfirm({
              title: t('categories.archivePool'),
              message: t('categories.archivePoolConfirm', { name: pool.name }),
              confirmText: t('categories.archivePool'),
              isDestructive: true,
              onConfirm: () => archivePoolMut.mutate({ poolId: pool.id }),
            });
          }}
        />

        {pool.poolType !== 'GOAL' && (
          <PoolCategoriesSection
            poolId={pool.id}
            categories={filteredCategories}
            allCount={poolCategories.length}
            expanded={categoriesExpanded}
            onToggleExpand={() => setCategoriesExpanded((v) => !v)}
            onAddCategory={() => {
              setSelectedCatForEdit(null);
              setCatModalVisible(true);
            }}
            searchQuery={catSearchQuery}
            onSearchChange={setCatSearchQuery}
            activeFilterCount={catPriorityFilter !== 'ALL' ? 1 : 0}
            onOpenFilter={() => setCatFilterSheetVisible(true)}
          />
        )}

        <PoolUpcomingSection
          poolId={pool.id}
          upcomingExpenses={upcomingExpenses}
          expanded={upcomingExpanded}
          onToggleExpand={() => setUpcomingExpanded((v) => !v)}
          onMarkPaid={(evt) => setMarkPaidEvent(evt)}
        />

        <PoolHistorySection
          poolId={pool.id}
          transactions={txLedgerQuery.data ?? []}
          expanded={historyExpanded}
          onToggleExpand={() => setHistoryExpanded((v) => !v)}
        />
      </ScrollView>

      <MobileFilterSheet
        visible={catFilterSheetVisible}
        onClose={() => setCatFilterSheetVisible(false)}
        title={t('common.filter')}
        activeCount={catPriorityFilter !== 'ALL' ? 1 : 0}
        sortField={catSortField}
        sortOrder={catSortDir}
        onSortFieldChange={(field) => setCatSortField(field as 'name' | 'amount')}
        onSortOrderChange={setCatSortDir}
        sortOptions={[
          { id: 'name', label: t('common.name') },
          { id: 'amount', label: t('common.amount') },
        ]}
        sections={[
          {
            id: 'priority',
            title: t('categories.priorityLabel'),
            options: [
              { id: 'ALL', label: t('transactions.filterAll') },
              { id: 'PRIORITISED', label: t('categories.priority1') },
              { id: 'REGULAR', label: t('categories.standardPriority') },
            ],
            selectedValue: catPriorityFilter,
            onSelect: (val) => setCatPriorityFilter(val as 'ALL' | 'PRIORITISED' | 'REGULAR'),
          },
        ]}
        onReset={() => {
          setCatPriorityFilter('ALL');
          setCatSortField('name');
          setCatSortDir('asc');
        }}
      />

      <CategoryItemModal
        visible={catModalVisible}
        poolId={id!}
        categoryToEdit={selectedCatForEdit}
        onClose={() => setCatModalVisible(false)}
        onSuccess={() => {
          categoriesQuery.refetch();
          poolsQuery.refetch();
        }}
      />

      <CategoryFormModal
        visible={poolModalVisible}
        categoryToEdit={{
          id: pool.id,
          name: pool.name,
          type: pool.poolType,
          targetAmount: pool.targetAmount,
          targetDate: pool.targetDate,
          bankAccountId: pool.bankAccountId,
          everydayAllowanceAmount: pool.everydayAllowanceAmount,
          isSurplusTarget: pool.isSurplusTarget,
        }}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      <QuickExpenseModal
        visible={moveMoneyVisible}
        initialType="TRANSFER"
        initialSourcePoolId={pool.id}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          poolsQuery.refetch();
          txLedgerQuery.refetch();
        }}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundContainer: { padding: 30, alignItems: 'center' },
  notFoundText: { fontSize: 14, color: DESIGN_TOKENS.colors.textMuted },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 60 },
});
