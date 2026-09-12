import React, { useState } from 'react';
import {
  View,
  Text,
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
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD } from '../../../lib/format';
import { CategoryItemModal, CategoryItemToEdit } from '../../../components/CategoryItemModal';
import { CategoryFormModal } from '../../../components/CategoryFormModal';
import { MoveMoneyModal } from '../../../components/MoveMoneyModal';
import { showMobileConfirm } from '../../../components/MobileConfirmDialog';

export default function PoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [selectedCatForEdit, setSelectedCatForEdit] = useState<CategoryItemToEdit | null>(null);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);

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
  const txLedgerQuery = trpc.listTransactions.useQuery({ poolId: id });

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

  const handleArchivePool = () => {
    if (!pool) return;
    showMobileConfirm({
      title: 'Archive Pool',
      message: `Are you sure you want to archive "${pool.name}"? Funds must be moved to another pool before archival.`,
      confirmText: 'Archive',
      onConfirm: () => archivePoolMut.mutate({ poolId: pool.id }),
    });
  };

  const handleArchiveCategory = (catId: string, catName: string) => {
    showMobileConfirm({
      title: 'Archive Category',
      message: `Are you sure you want to archive "${catName}"?`,
      confirmText: 'Archive',
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
      <MobileScreenWrapper title="Pool Not Found" showBack onBackPress={() => router.back()}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Pool not found or archived.</Text>
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
                    <Text style={styles.surplusPillText}>Surplus Target</Text>
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
                  Linked to {bankAccount.name}
                </Text>
              )}
            </View>

            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
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
              <Text style={styles.actionBtnText}>Move Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPoolModalVisible(true)}
              style={styles.actionBtn}
            >
              <Feather name="edit-2" size={14} color="#64748B" />
              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>
                Edit Pool
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleArchivePool}
              style={styles.actionBtn}
            >
              <Feather name="archive" size={14} color="#94A3B8" />
              <Text style={[styles.actionBtnText, { color: '#94A3B8' }]}>
                Archive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nested Categories Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Budget Categories ({poolCategories.length})
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedCatForEdit(null);
              setCatModalVisible(true);
            }}
            style={styles.addCategoryBtn}
          >
            <Feather name="plus" size={14} color="#2563eb" />
            <Text style={styles.addCategoryText}>Add Category</Text>
          </TouchableOpacity>
        </View>

        {poolCategories.length > 0 ? (
          <View style={styles.categoriesList}>
            {poolCategories.map((cat) => (
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
                        <Text style={styles.essentialText}>Essential</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.catFreq}>
                    {cat.budgetFrequency || 'Monthly'}
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
              No nested categories inside this pool yet. Tap &apos;+ Add Category&apos; to break down your budget.
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
                  <Text style={styles.sheetSubtitle}>Category Breakdown</Text>
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
                  <Text style={styles.sheetLabel}>Budget Amount</Text>
                  <Text style={styles.sheetValue}>
                    {formatAUD(inspectCat.enteredAmount || inspectCat.monthlyAmount || 0)}
                  </Text>
                </View>

                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetLabel}>Frequency</Text>
                  <Text style={styles.sheetValue}>
                    {inspectCat.budgetFrequency || 'Monthly'}
                  </Text>
                </View>

                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetLabel}>Essential Priority</Text>
                  <Text style={styles.sheetValue}>
                    {inspectCat.isEssential ? 'Yes (Priority 1)' : 'Standard'}
                  </Text>
                </View>
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
                      budgetFrequency: c.budgetFrequency as any,
                      isEssential: c.isEssential,
                    });
                    setCatModalVisible(true);
                  }}
                  style={styles.sheetEditBtn}
                >
                  <Feather name="edit-2" size={14} color="#2563eb" />
                  <Text style={styles.sheetEditText}>Edit Category</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleArchiveCategory(inspectCat.id, inspectCat.name)}
                  style={styles.sheetArchiveBtn}
                >
                  <Feather name="archive" size={14} color="#ba1a1a" />
                  <Text style={styles.sheetArchiveText}>Archive</Text>
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
        }}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      {/* Move Money Modal */}
      <MoveMoneyModal
        visible={moveMoneyVisible}
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
