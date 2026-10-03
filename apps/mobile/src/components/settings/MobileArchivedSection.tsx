import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
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
import { formatAUD } from '../../lib/format';

type FilterType =
  | 'ALL'
  | 'CATEGORY'
  | 'POOL'
  | 'INCOME_SOURCE'
  | 'EXPENSE_SOURCE'
  | 'BANK_ACCOUNT';

interface ArchivedItem {
  id: string;
  name: string;
  itemType: FilterType;
  subtitle?: string | null;
  archivedAt: string | Date | null;
}

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

  const formatSubtitle = (item: ArchivedItem) => {
    if (!item.subtitle) return null;
    if (item.itemType === 'POOL') {
      return item.subtitle === 'EVERYDAY'
        ? t('poolTypes.everyday')
        : item.subtitle === 'REGULAR'
        ? t('poolTypes.regular')
        : t('poolTypes.goal');
    }
    const num = parseFloat(item.subtitle);
    if (!isNaN(num)) {
      return formatAUD(num);
    }
    return item.subtitle;
  };

  const getItemTypeBadge = (itemType: string) => {
    const typeKey = `settings.archived.types.${itemType}` as const;
    return t(typeKey) || itemType.replace(/_/g, ' ');
  };

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

  const filterOptions: { type: FilterType; label: string }[] = [
    { type: 'ALL', label: t('common.all') },
    { type: 'CATEGORY', label: t('settings.archived.categories') },
    { type: 'POOL', label: t('settings.archived.pools') },
    { type: 'INCOME_SOURCE', label: t('settings.archived.income') },
    { type: 'EXPENSE_SOURCE', label: t('settings.archived.expenses') },
    { type: 'BANK_ACCOUNT', label: t('settings.archived.accounts') },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <SearchInput
        value={search}
        onChangeText={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder={t('settings.archived.searchPlaceholder')}
      />

      {/* Filter Pills */}
      <View style={styles.pillContainer}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            onPress={() => {
              setFilterType(opt.type);
              setPage(1);
            }}
            style={[styles.pill, filterType === opt.type && styles.pillActive]}
          >
            <Text
              style={[
                styles.pillText,
                filterType === opt.type && styles.pillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {archivedQuery.isLoading ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : paginated.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {t('settings.archived.emptyTitle')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t('settings.archived.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={paginated}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isRowRestoring = restoringId === item.id;
            const subtitle = formatSubtitle(item);

            return (
              <View style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {getItemTypeBadge(item.itemType)}
                      </Text>
                    </View>
                  </View>
                  {subtitle ? (
                    <Text style={styles.itemSubtitle}>{subtitle}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleRestore(item)}
                  style={styles.restoreBtn}
                  disabled={restoreMutation.isPending}
                >
                  {isRowRestoring ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Text style={styles.restoreBtnText}>
                      {t('settings.archived.restoreAction')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Conditional Pagination */}
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
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: '#1B2B4B',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  restoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    minWidth: 70,
    alignItems: 'center',
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
