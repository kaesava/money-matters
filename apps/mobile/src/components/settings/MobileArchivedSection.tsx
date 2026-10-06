import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  SearchInput,
  SkeletonCard,
  MobilePaginationBar,
  showMobileConfirm,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import {
  ArchivedFilterChips,
  FilterType,
} from './archived/ArchivedFilterChips';
import { ArchivedItemRow, ArchivedItem } from './archived/ArchivedItemRow';

export function MobileArchivedSection() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
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

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || item.itemType === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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
            itemType: item.itemType as any,
          });
        } catch {
          // Handled in onError
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <SearchInput
        value={search}
        onChangeText={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder={t('settings.archived.searchPlaceholder')}
      />

      <ArchivedFilterChips
        filterType={filterType}
        onSelectFilter={(type) => {
          setFilterType(type);
          setPage(1);
        }}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
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
