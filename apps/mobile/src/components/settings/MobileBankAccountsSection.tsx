import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { styles } from './bank-accounts/MobileBankAccountsStyles';
import { HouseholdOptimizerBanner } from './bank-accounts/HouseholdOptimizerBanner';
import {
  DESIGN_TOKENS,
  SearchInput,
  MobileFilterSheet,
  MobilePoolPicker,
  MobilePaginationBar,
  InfoTooltip,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import {
  BankAccountFormModal,
  BankAccountItemToEdit,
} from '../BankAccountFormModal';
import {
  MobileReconciliationModal,
  MobileReconciliationModalProps,
} from '../envelopes/MobileReconciliationModal';
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

  const [reconcileAccount, setReconcileAccount] = useState<MobileReconciliationModalProps['account'] | null>(null);
  const [poolsSheetAccount, setPoolsSheetAccount] = useState<{
    name: string;
    pools: LinkedPoolItem[];
  } | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // Search, Filter, Sort State
  const searchParams = useLocalSearchParams<{ id?: string }>();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(searchParams.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'balance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  React.useEffect(() => {
    if (searchParams.id) {
      setSelectedAccountId(searchParams.id);
    }
  }, [searchParams.id]);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedPoolId, selectedAccountId, sortField, sortOrder, pageSize]);

  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const accounts = bankAccountsQuery.data || [];
  const allPools = poolsQuery.data || [];

  const filteredAccounts = accounts
    .filter((acc) => {
      if (selectedAccountId && acc.id !== selectedAccountId) {
        return false;
      }
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

  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const paginatedAccounts = filteredAccounts.slice((page - 1) * pageSize, page * pageSize);
  const targetedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null;

  const activeFilterCount =
    (selectedPoolId !== 'ALL' ? 1 : 0) +
    (selectedAccountId ? 1 : 0) +
    (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0);

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

      {/* Household Banking Optimizer banner */}
      {accounts.length <= 1 && <HouseholdOptimizerBanner />}

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

      {/* Active Account Filter Banner */}
      {selectedAccountId && targetedAccount && (
        <View style={styles.appliedFilterBanner}>
          <View style={styles.appliedFilterContent}>
            <Feather name="filter" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
            <Text style={styles.appliedFilterText} numberOfLines={1}>
              {targetedAccount.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedAccountId(null)}
            style={styles.clearFilterBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Feather name="x" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
            <Text style={styles.clearFilterText}>{t('common.clear')}</Text>
          </TouchableOpacity>
        </View>
      )}

            {/* Tip Card: Shown ONLY when active accounts count is 1 */}
      {accounts.length === 1 && (
        <View style={styles.tipCard}>
          <Feather name="info" size={16} color={DESIGN_TOKENS.colors.sereneBlue} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.tipCardTitle}>{t('bankAccounts.tipCardTitle')}</Text>
            <Text style={styles.tipCardBody}>{t('bankAccounts.tipCardBody')}</Text>
          </View>
        </View>
      )}

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
          {paginatedAccounts.map((acc) => {
            const linkedPools: LinkedPoolItem[] = allPools
              .filter((p) => p.bankAccountId === acc.id)
              .map((p) => ({
                id: p.id,
                name: p.name,
                poolType: p.envelopeType,
                currentBalance: p.currentBalance,
                isSurplusTarget: p.isSurplusTarget,
              }));

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
                    linkedPools: linkedPools.map((p) => ({
                      id: p.id,
                      name: p.name,
                      poolType: p.poolType,
                      currentBalance: p.currentBalance ?? 0,
                      isSurplusTarget: p.isSurplusTarget,
                    })),
                  })
                }
                onPressPool={(poolId) => router.push(`/(app)/envelopes/${poolId}` as Href)}
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

      {/* Conditional Pagination Bar */}
      {filteredAccounts.length >= 5 && (
        <MobilePaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredAccounts.length}
          pageSizeOptions={[5, 10, 20]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
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
                  poolType: p.envelopeType,
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
          setSelectedAccountId(null);
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

