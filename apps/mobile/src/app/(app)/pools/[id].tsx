import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  BankProviderBadge,
  showMobileConfirm,
  SearchInput,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD } from '../../../lib/format';
import { TransactionRow } from '../../../components/TransactionRow';
import { CategoryItemModal, CategoryItemToEdit } from '../../../components/CategoryItemModal';
import { CategoryFormModal } from '../../../components/CategoryFormModal';
import { QuickExpenseModal } from '../../../components/QuickExpenseModal';

export default function PoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [selectedCatForEdit, setSelectedCatForEdit] = useState<CategoryItemToEdit | null>(null);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catSortField, setCatSortField] = useState<'name' | 'amount'>('name');
  const [catSortDir, setCatSortDir] = useState<'asc' | 'desc'>('asc');

  // Category bottom sheet inspector
  const [inspectCat, setInspectCat] = useState<{
    id: string;
    name: string;
    enteredAmount?: string | null;
    monthlyAmount?: string | null;
    budgetFrequency?: string | null;
    isEssential?: boolean;
  } | null>(null);

  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const txLedgerQuery = trpc.listTransactions.useQuery({ poolId: id, limit: 10 });

  const archivePoolMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      router.back();
    },
  });

  const archiveCatMut = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
      utils.listPools.invalidate();
      setInspectCat(null);
    },
  });

  const pool = poolsQuery.data?.find((p) => p.id === id);
  const poolCategories = (categoriesQuery.data ?? []).filter(
    (c) => c.poolId === id
  );
  const bankAccount = bankAccountsQuery.data?.find(
    (b) => b.id === pool?.bankAccountId
  );

  const filteredCategories = useMemo(() => {
    return poolCategories
      .filter((c) => {
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
  }, [poolCategories, catSearchQuery, catSortField, catSortDir]);

  const recentTransactions = (txLedgerQuery.data ?? []).slice(0, 5);

  const toggleCatSort = (field: 'name' | 'amount') => {
    if (catSortField === field) {
      setCatSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCatSortField(field);
      setCatSortDir('asc');
    }
  };

  const toast = useMobileToast();

  const handleArchivePool = () => {
    if (!pool) return;
    showMobileConfirm({
      title: t('categories.archivePool'),
      message: t('categories.archivePoolConfirm', { name: pool.name }),
      confirmText: t('categories.archivePool'),
      isDestructive: true,
      onConfirm: () => archivePoolMut.mutate({ poolId: pool.id }),
    });
  };

  const handleArchiveCategory = (catId: string, catName: string) => {
    showMobileConfirm({
      title: t('categories.archiveCategory'),
      message: t('categories.archiveCategoryConfirm', { name: catName }),
      confirmText: t('categories.archiveCategory'),
      isDestructive: true,
      onConfirm: () => archiveCatMut.mutate({ categoryId: catId }),
    });
  };

  if (poolsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!pool) {
    return (
      <MobileScreenWrapper title={t('categories.poolNotFound')} showBack onBackPress={() => router.back()}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('categories.poolNotFound')}</Text>
        </View>
      </MobileScreenWrapper>
    );
  }

  return (
    <MobileScreenWrapper
      title={pool.name}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pool Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View>
              <View style={styles.tagsRow}>
                <Text style={styles.poolTypeTag}>{pool.poolType}</Text>
                {pool.isSurplusTarget && (
                  <View style={styles.surplusPill}>
                    <Text style={styles.surplusPillText}>{t('categories.surplusBadgeText')}</Text>
                  </View>
                )}
                {bankAccount && (
                  <BankProviderBadge
                    provider={bankAccount.bankProvider}
                    size="sm"
                  />
                )}
              </View>
              <Text style={styles.poolNameTitle}>{pool.name}</Text>
              {bankAccount && (
                <Text style={styles.bankNameMeta}>
                  {t('categories.linkedAccount', { name: bankAccount.name })}
                </Text>
              )}
            </View>

            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>
                {t('categories.currentBalance')}
              </Text>
              <Text style={styles.balanceAmount}>
                {formatAUD(pool.currentBalance)}
              </Text>
            </View>
          </View>

          {/* Quick Pool Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => setMoveMoneyVisible(true)}
              style={styles.actionBtn}
            >
              <Feather name="repeat" size={14} color="#2563eb" />
              <Text style={styles.actionBtnText}>
                {t('dashboard.moveMoney')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPoolModalVisible(true)}
              style={styles.actionBtn}
            >
              <Feather name="edit-2" size={14} color="#64748B" />
              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>
                {t('categories.editPool')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleArchivePool}
              style={styles.actionBtn}
            >
              <Feather name="archive" size={14} color="#94A3B8" />
              <Text style={[styles.actionBtnText, { color: '#94A3B8' }]}>
                {t('common.archive')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nested Categories Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {t('categories.budgetCategories')} ({filteredCategories.length})
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedCatForEdit(null);
              setCatModalVisible(true);
            }}
            style={styles.addCategoryBtn}
          >
            <Feather name="plus" size={14} color="#2563eb" />
            <Text style={styles.addCategoryText}>
              {t('categories.addCategory')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Search & Sort Bar */}
        {poolCategories.length > 0 && (
          <View style={styles.catFilterBar}>
            <SearchInput
              placeholder={t('categories.searchCategories')}
              value={catSearchQuery}
              onChangeText={setCatSearchQuery}
            />

            <View style={styles.catSortRow}>
              <TouchableOpacity
                onPress={() => toggleCatSort('name')}
                style={[styles.catSortBtn, catSortField === 'name' && styles.catSortBtnActive]}
              >
                <Text style={[styles.catSortBtnText, catSortField === 'name' && styles.catSortBtnTextActive]}>
                  {t('common.name')} {catSortField === 'name' ? (catSortDir === 'asc' ? '▲' : '▼') : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => toggleCatSort('amount')}
                style={[styles.catSortBtn, catSortField === 'amount' && styles.catSortBtnActive]}
              >
                <Text style={[styles.catSortBtnText, catSortField === 'amount' && styles.catSortBtnTextActive]}>
                  {t('common.amount')} {catSortField === 'amount' ? (catSortDir === 'asc' ? '▲' : '▼') : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {filteredCategories.length > 0 ? (
          <View style={styles.categoriesList}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.75}
                onPress={() => setInspectCat(cat as unknown as typeof inspectCat)}
                style={styles.categoryCard}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.catTitleRow}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    {cat.isEssential && (
                      <View style={styles.essentialBadge}>
                        <Text style={styles.essentialText}>{t('categories.essentialBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.catFreq}>
                    {cat.budgetFrequency || t('categories.frequencyMonthly')}
                  </Text>
                </View>

                <View style={styles.catAmountCol}>
                  <Text style={styles.catAmount}>
                    {formatAUD(cat.enteredAmount || cat.monthlyAmount || 0)}
                  </Text>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCategoriesBox}>
            <Text style={styles.emptyCategoriesText}>
              {poolCategories.length === 0
                ? t('categories.noCategoriesDefined')
                : t('categories.noCategoriesMatched')}
            </Text>
          </View>
        )}

        {/* Recent Activity Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            {t('categories.recentActivity')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/transactions?poolId=${pool.id}` as never)}
            style={styles.viewHistoryBtn}
          >
            <Text style={styles.viewHistoryText}>
              {t('categories.viewAllHistory')}
            </Text>
            <Feather name="chevron-right" size={13} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          <View style={styles.recentTxList}>
            {recentTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                amount={tx.amount}
                flowType={tx.flowType as 'DEBIT' | 'CREDIT' | 'TRANSFER'}
                poolName={tx.poolName}
                categoryName={tx.categoryName}
                note={tx.note}
                recordedAt={tx.recordedAt}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCategoriesBox}>
            <Text style={styles.emptyCategoriesText}>
              {t('categories.noRecentActivity')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Category Detail Bottom Sheet */}
      {inspectCat && (
        <Modal
          visible={!!inspectCat}
          transparent
          animationType="slide"
          onRequestClose={() => setInspectCat(null)}
        >
          <View style={styles.sheetOverlay}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{inspectCat.name}</Text>
                  <Text style={styles.sheetSubtitle}>{t('categories.categoryBreakdown')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setInspectCat(null)}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetBody}>
                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetLabel}>{t('categories.budgetAmount')}</Text>
                  <Text style={styles.sheetValue}>
                    {formatAUD(inspectCat.enteredAmount || inspectCat.monthlyAmount || 0)}
                  </Text>
                </View>

                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetLabel}>{t('categories.frequencyLabel')}</Text>
                  <Text style={styles.sheetValue}>
                    {inspectCat.budgetFrequency || t('categories.frequencyMonthly')}
                  </Text>
                </View>

                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetLabel}>{t('categories.priorityLabel')}</Text>
                  <Text style={styles.sheetValue}>
                    {inspectCat.isEssential ? t('categories.priority1') : t('categories.standardPriority')}
                  </Text>
                </View>
              </View>

              {/* Navigation Quick Links */}
              <View style={styles.sheetLinksRow}>
                <TouchableOpacity
                  onPress={() => {
                    const name = inspectCat.name;
                    setInspectCat(null);
                    router.push(`/(app)/transactions?search=${encodeURIComponent(name)}` as never);
                  }}
                  style={styles.sheetLinkBtn}
                >
                  <Feather name="clock" size={13} color="#2563eb" />
                  <Text style={styles.sheetLinkText}>
                    {t('transactions.title')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setInspectCat(null);
                    router.push('/(app)/paychecks' as never);
                  }}
                  style={styles.sheetLinkBtn}
                >
                  <Feather name="calendar" size={13} color="#2563eb" />
                  <Text style={styles.sheetLinkText}>
                    {t('categories.viewExpenses')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  onPress={() => {
                    const c = inspectCat;
                    setInspectCat(null);
                    setSelectedCatForEdit({
                      id: c.id,
                      name: c.name,
                      enteredAmount: c.enteredAmount,
                      monthlyAmount: c.monthlyAmount,
                      budgetFrequency: (c.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') || undefined,
                      isEssential: c.isEssential,
                    });
                    setCatModalVisible(true);
                  }}
                  style={styles.sheetEditBtn}
                >
                  <Feather name="edit-2" size={14} color="#2563eb" />
                  <Text style={styles.sheetEditText}>{t('categories.editTitle', { name: inspectCat.name })}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleArchiveCategory(inspectCat.id, inspectCat.name)}
                  style={styles.sheetArchiveBtn}
                >
                  <Feather name="archive" size={14} color="#ba1a1a" />
                  <Text style={styles.sheetArchiveText}>{t('categories.archiveCategory')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Category Add/Edit Modal */}
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

      {/* Pool Edit Modal */}
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

      {/* Move Money Modal (Re-using QuickExpenseModal in TRANSFER mode) */}
      <QuickExpenseModal
        visible={moveMoneyVisible}
        initialType="TRANSFER"
        initialSourcePoolId={pool.id}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundContainer: {
    padding: 30,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  poolTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  surplusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surplusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  poolNameTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  bankNameMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  categoriesList: {
    gap: 10,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  essentialBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  essentialText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  catFreq: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  catAmountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  emptyCategoriesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
  },
  emptyCategoriesText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  sheetValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  catFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  catSearchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  catSearchInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 12,
    color: '#1B2B4B',
  },
  catSortRow: {
    flexDirection: 'row',
    gap: 4,
  },
  catSortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catSortBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  catSortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catSortBtnTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  recentTxList: {
    gap: 8,
  },
  sheetLinksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
  },
  sheetLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
  },
  sheetEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  sheetArchiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingVertical: 12,
  },
  sheetArchiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BA1A1A',
  },
});
