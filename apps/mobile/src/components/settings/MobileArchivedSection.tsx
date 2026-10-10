import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SearchInput,
  SkeletonCard,
  MobilePaginationBar,
  MobileFilterSheet,
  InfoTooltip,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { ArchivedItemRow, ArchivedItem, ArchivedItemType } from './archived/ArchivedItemRow';

export function MobileArchivedSection() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ArchivedItemType>('ALL');
  const [sortField, setSortField] = useState<'name' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const pageSize = 10;

  const archivedQuery = trpc.listArchivedItems.useQuery();
  const restoreMutation = trpc.restoreItem.useMutation({
    onSuccess: async () => {
      await Promise.all([
        archivedQuery.refetch(),
        utils.listPools.invalidate(),
        utils.listCategories.invalidate(),
        utils.listIncomeSources.invalidate(),
        utils.listExpenseSources.invalidate(),
        utils.listBankAccounts.invalidate(),
        utils.listBankAccountsWithExpected.invalidate(),
        utils.getMatrixProjectionData.invalidate(),
        utils.listTransactions.invalidate(),
      ]);
      toast.success(t('settings.archived.restoreSuccess'));
      setRestoringId(null);
    },
    onError: (err) => {
      const msg = err.message.includes('parent pool is archived')
        ? t('settings.archived.orphanCategoryError')
        : err.message || t('common.errorTryAgain');
      toast.error(msg);
      setRestoringId(null);
    },
  });

  const items = (archivedQuery.data ?? []) as ArchivedItem[];

  const filtered = items
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'ALL' || item.itemType === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else {
        comp = a.itemType.localeCompare(b.itemType);
      }
      return sortOrder === 'asc' ? comp : -comp;
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeFilterCount =
    (filterType !== 'ALL' ? 1 : 0) + (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0);

  const handleRestore = (item: ArchivedItem) => {
    showMobileConfirm({
      title: t('settings.archived.restoreTitle'),
      message: t('settings.archived.restoreConfirm', {
        name: item.name,
      }),
      confirmText: t('settings.archived.restoreAction'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        setRestoringId(item.id);
        try {
          await restoreMutation.mutateAsync({
            itemId: item.id,
            itemType: item.itemType,
          });
        } catch {
          // Handled in onError
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Title & InfoTooltip Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('settings.tabs.archived')}</Text>
        <InfoTooltip
          title={t('tooltips.archived.title')}
          content={t('tooltips.archived.content')}
        />
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchAndFilterRow}>
        <View style={styles.flex1}>
          <SearchInput
            value={search}
            onChangeText={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder={t('settings.archived.searchPlaceholder')}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Feather
            name="sliders"
            size={15}
            color={activeFilterCount > 0 ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.textMuted}
          />
          <Text
            style={[
              styles.filterBtnText,
              activeFilterCount > 0 && styles.filterBtnTextActive,
            ]}
          >
            {t('common.filter')}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {archivedQuery.isLoading ? (
        <View style={styles.loaderWrap}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : paginated.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('settings.archived.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('settings.archived.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={paginated}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <ArchivedItemRow
              item={item}
              isRestoring={restoringId === item.id}
              disableRestore={restoreMutation.isPending}
              onRestore={() => handleRestore(item)}
            />
          )}
        />
      )}

      {filtered.length >= 5 && (
        <MobilePaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
        />
      )}

      {/* Filter and Sort Sheet */}
      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeFilterCount}
        sortField={sortField}
        sortOrder={sortOrder}
        sortOptions={[
          { id: 'name', label: t('common.name') },
          { id: 'type', label: t('common.type') },
        ]}
        onSortFieldChange={(field) => {
          setSortField(field as 'name' | 'type');
          setPage(1);
        }}
        onSortOrderChange={(order) => {
          setSortOrder(order);
          setPage(1);
        }}
        sections={[
          {
            id: 'type',
            title: t('common.type'),
            selectedValue: filterType,
            onSelect: (val: string) => {
              setFilterType(val as ArchivedItemType);
              setPage(1);
            },
            options: [
              { id: 'ALL', label: t('common.all') },
              { id: 'POOL', label: t('settings.archived.pools') },
              { id: 'CATEGORY', label: t('settings.archived.categories') },
              { id: 'INCOME_SOURCE', label: t('settings.archived.income') },
              { id: 'EXPENSE_SOURCE', label: t('settings.archived.expenses') },
              { id: 'BANK_ACCOUNT', label: t('settings.archived.accounts') },
            ],
          },
        ]}
        onReset={() => {
          setFilterType('ALL');
          setSortField('name');
          setSortOrder('asc');
          setPage(1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  flex1: {
    flex: 1,
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  filterBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  filterBtnTextActive: {
    color: DESIGN_TOKENS.colors.accent,
  },
  loaderWrap: {
    gap: 10,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
  },
});
