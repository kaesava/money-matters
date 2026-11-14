import React from 'react';
import { MobileFilterSheet, MobilePoolPicker } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { NotesFeedModal } from '@money-matters/capability-file-notes/mobile';
import { BankAccountFormModal, BankAccountItemToEdit } from '../../BankAccountFormModal';
import { MobileReconciliationModal, MobileReconciliationModalProps } from '../../envelopes/MobileReconciliationModal';
import { LinkedPoolsModalSheet, LinkedPoolItem } from '../../bank-accounts/LinkedPoolsModalSheet';
import { QuickExpenseModal } from '../../QuickExpenseModal';

interface MobileBankAccountsModalsProps {
  filterSheetVisible: boolean;
  onCloseFilterSheet: () => void;
  activeFilterCount: number;
  sortField: 'name' | 'balance';
  setSortField: (field: 'name' | 'balance') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  allPools: Array<{ id: string; name: string; envelopeType: string; currentBalance: number }>;
  selectedPoolId: string;
  setSelectedPoolId: (id: string) => void;
  onResetFilters: () => void;
  formModalVisible: boolean;
  accountToEdit: BankAccountItemToEdit | null;
  onCloseFormModal: () => void;
  reconcileAccount: MobileReconciliationModalProps['account'] | null;
  setReconcileAccount: (acc: MobileReconciliationModalProps['account'] | null) => void;
  poolsSheetAccount: { name: string; pools: LinkedPoolItem[] } | null;
  setPoolsSheetAccount: (val: { name: string; pools: LinkedPoolItem[] } | null) => void;
  transferModalVisible: boolean;
  setTransferModalVisible: (val: boolean) => void;
  notesAccount: { id: string; name: string } | null;
  setNotesAccount: (val: { id: string; name: string } | null) => void;
  onRefetchAll: () => void;
  onRefetchAccounts: () => void;
}

/**
 * Filter sheet and modal stack for MobileBankAccountsSection.
 */
export function MobileBankAccountsModals({
  filterSheetVisible,
  onCloseFilterSheet,
  activeFilterCount,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  allPools,
  selectedPoolId,
  setSelectedPoolId,
  onResetFilters,
  formModalVisible,
  accountToEdit,
  onCloseFormModal,
  reconcileAccount,
  setReconcileAccount,
  poolsSheetAccount,
  setPoolsSheetAccount,
  transferModalVisible,
  setTransferModalVisible,
  notesAccount,
  setNotesAccount,
  onRefetchAll,
  onRefetchAccounts,
}: MobileBankAccountsModalsProps) {
  return (
    <>
      <MobileFilterSheet
        visible={filterSheetVisible}
        onClose={onCloseFilterSheet}
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
        onReset={onResetFilters}
      />

      <BankAccountFormModal
        visible={formModalVisible}
        accountToEdit={accountToEdit}
        onClose={onCloseFormModal}
        onSuccess={onRefetchAccounts}
        onNeedsReconciliation={(accToReconcile) => setReconcileAccount(accToReconcile)}
      />

      <MobileReconciliationModal
        visible={!!reconcileAccount}
        account={reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        onSuccess={onRefetchAll}
        onOpenTransfer={() => {
          setReconcileAccount(null);
          setTransferModalVisible(true);
        }}
      />

      {poolsSheetAccount && (
        <LinkedPoolsModalSheet
          visible={!!poolsSheetAccount}
          onClose={() => setPoolsSheetAccount(null)}
          accountName={poolsSheetAccount.name}
          pools={poolsSheetAccount.pools}
        />
      )}

      <QuickExpenseModal
        visible={transferModalVisible}
        initialType="TRANSFER"
        onClose={() => setTransferModalVisible(false)}
        onSuccess={onRefetchAll}
      />

      {notesAccount && (
        <NotesFeedModal
          visible={!!notesAccount}
          onClose={() => setNotesAccount(null)}
          entityType="BANK_ACCOUNT"
          entityId={notesAccount.id}
          entityName={notesAccount.name}
        />
      )}
    </>
  );
}
