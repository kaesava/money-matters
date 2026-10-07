import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SearchInput,
  MobileFilterSheet,
  MobilePoolPicker,
  InfoTooltip,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import {
  BankAccountFormModal,
  BankAccountItemToEdit,
} from '../BankAccountFormModal';
import { MobileReconciliationModal } from '../categories/MobileReconciliationModal';
import { BankAccountCard } from '../bank-accounts/BankAccountCard';
import {
  LinkedPoolsModalSheet,
  LinkedPoolItem,
} from '../bank-accounts/LinkedPoolsModalSheet';
import { QuickExpenseModal } from '../QuickExpenseModal';

export function MobileBankAccountsSection() {
  const router = useRouter();

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccountItemToEdit | null>(null);

  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);
  const [poolsSheetAccount, setPoolsSheetAccount] = useState<{
    name: string;
    pools: LinkedPoolItem[];
  } | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'balance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const accounts = bankAccountsQuery.data || [];
  const allPools = poolsQuery.data || [];

  const filteredAccounts = accounts
    .filter((acc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        acc.name.toLowerCase().includes(q) ||
        (acc.bankProvider || '').toLowerCase().includes(q);

      const matchesPool =
        selectedPoolId === 'ALL' ||
        allPools.some((p) => p.bankAccountId === acc.id && p.id === selectedPoolId);

      return matchesSearch && matchesPool;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else {
        const balA = parseFloat(a.lastKnownBalance || '0');
        const balB = parseFloat(b.lastKnownBalance || '0');
        comp = balA - balB;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });

  const activeFilterCount =
    (selectedPoolId !== 'ALL' ? 1 : 0) + (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0);

  return (
    <View style={styles.container}>
      {/* Top Action Header with Clean Title & InfoTooltip */}
      <View style={styles.topRow}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.sectionHeaderTitle}>
            {t('settings.accounts')} ({accounts.length})
          </Text>
          <InfoTooltip
            title={t('tooltips.bankAccounts.title')}
            content={t('tooltips.bankAccounts.content')}
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            setAccountToEdit(null);
            setFormModalVisible(true);
          }}
          style={styles.addAccountBtn}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={14} color={DESIGN_TOKENS.colors.onAccent} />
          <Text style={styles.addAccountText}>
            {t('settings.bankAccounts.addAccount')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Controls */}
      <View style={styles.searchAndFilterRow}>
        <View style={styles.flex1}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('settings.bankAccounts.searchPlaceholder')}
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

      {/* Bank Accounts List */}
      {bankAccountsQuery.isLoading ? (
        <ActivityIndicator color={DESIGN_TOKENS.colors.sereneBlue} style={styles.loader} />
      ) : filteredAccounts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="credit-card" size={32} color={DESIGN_TOKENS.colors.subtleText} />
          <Text style={styles.emptyTitle}>{t('bankAccounts.noAccountsFound')}</Text>
          <Text style={styles.emptyDesc}>
            {t('bankAccounts.noAccountsDescription')}
          </Text>
        </View>
      ) : (
        <View style={styles.accountsList}>
          {filteredAccounts.map((acc) => {
            const linkedPools: LinkedPoolItem[] = allPools.filter((p) => p.bankAccountId === acc.id);

            return (
              <BankAccountCard
                key={acc.id}
                account={acc}
                linkedPools={linkedPools}
                onPressEdit={() => {
                  setAccountToEdit({
                    id: acc.id,
                    name: acc.name,
                    bankProvider: acc.bankProvider,
                    lastKnownBalance: acc.lastKnownBalance,
                    unbudgetedBuffer: acc.unbudgetedBuffer,
                    isPrivate: acc.isPrivate,
                  });
                  setFormModalVisible(true);
                }}
                onPressAlign={() =>
                  setReconcileAccount({
                    id: acc.id,
                    name: acc.name,
                    lastKnownBalance: acc.lastKnownBalance,
                    unbudgetedBuffer: acc.unbudgetedBuffer,
                    expectedBalance: acc.expectedBalance,
                    linkedPools,
                  })
                }
                onPressPool={(poolId) => router.push(`/(app)/pools/${poolId}` as never)}
                onPressMorePools={() =>
                  setPoolsSheetAccount({
                    name: acc.name,
                    pools: linkedPools,
                  })
                }
              />
            );
          })}
        </View>
      )}

      {/* Filter Sheet for Bank Accounts */}
      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        activeCount={activeFilterCount}
        sortField={sortField}
        sortOrder={sortOrder}
        sortOptions={[
          { id: 'name', label: t('common.name') },
          { id: 'balance', label: t('common.amount') },
        ]}
        onSortFieldChange={(field) => setSortField(field as 'name' | 'balance')}
        onSortOrderChange={setSortOrder}
        sections={[
          {
            id: 'pool',
            title: t('categories.title'),
            renderCustom: () => (
              <MobilePoolPicker
                pools={allPools.map((p) => ({
                  id: p.id,
                  name: p.name,
                  poolType: p.poolType,
                  currentBalance: p.currentBalance,
                }))}
                selectedPoolId={selectedPoolId}
                onSelectPool={(pId) => setSelectedPoolId(pId)}
                allowAllOption={true}
              />
            ),
          },
        ]}
        onReset={() => {
          setSelectedPoolId('ALL');
          setSortField('name');
          setSortOrder('asc');
        }}
      />

      {/* Account Create/Edit Modal */}
      <BankAccountFormModal
        visible={formModalVisible}
        accountToEdit={accountToEdit}
        onClose={() => setFormModalVisible(false)}
        onSuccess={() => bankAccountsQuery.refetch()}
        onNeedsReconciliation={(accToReconcile) => setReconcileAccount(accToReconcile)}
      />

      {/* Balance Reconciliation Modal */}
      <MobileReconciliationModal
        visible={!!reconcileAccount}
        account={reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        onSuccess={() => {
          bankAccountsQuery.refetch();
          poolsQuery.refetch();
        }}
        onOpenTransfer={() => {
          setReconcileAccount(null);
          setTransferModalVisible(true);
        }}
      />

      {/* Linked Pools Sheet */}
      {poolsSheetAccount && (
        <LinkedPoolsModalSheet
          visible={!!poolsSheetAccount}
          onClose={() => setPoolsSheetAccount(null)}
          accountName={poolsSheetAccount.name}
          pools={poolsSheetAccount.pools}
        />
      )}

      {/* Transfer Between Pools Modal */}
      <QuickExpenseModal
        visible={transferModalVisible}
        initialType="TRANSFER"
        onClose={() => setTransferModalVisible(false)}
        onSuccess={() => {
          bankAccountsQuery.refetch();
          poolsQuery.refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
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
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  loader: {
    marginVertical: 40,
  },
  emptyCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  accountsList: {
    gap: 12,
  },
});
