import React from 'react';
import { showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { IncomeExpenseFormModal, SourceToEdit } from '../IncomeExpenseFormModal';
import { MarkPaidModal, MarkPaidEvent } from '../MarkPaidModal';
import { EventOverrideModal } from '../EventOverrideModal';
import { MobileTransferModal, TransferEventData } from './MobileTransferModal';
import {
  MobileCategoryDetailModal,
  CategoryScheduledEvent,
} from './MobileCategoryDetailModal';
import {
  MobileBurstModal,
  BurstSourceItem,
  BurstEventItem,
} from './MobileBurstModal';

export interface PaychecksModalManagerProps {
  formModalVisible: boolean;
  formMode: 'INCOME' | 'EXPENSE';
  sourceToEdit: SourceToEdit | null;
  onCloseForm: () => void;
  markPaidEvent: MarkPaidEvent | null;
  onCloseMarkPaid: () => void;
  overrideModalVisible: boolean;
  eventToOverride: {
    id: string;
    eventType: 'INCOME' | 'EXPENSE';
    name: string;
    expectedDate: string;
    expectedAmount: string;
  } | null;
  onCloseOverride: () => void;
  transferModalVisible: boolean;
  activeTransfer: TransferEventData | null;
  pools: { id: string; name: string; poolType?: string; currentBalance?: string | number | null; isPrivate?: boolean | null }[];
  onCloseTransfer: () => void;
  categoryModalVisible: boolean;
  activeCategoryDetail: {
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: CategoryScheduledEvent[];
  } | null;
  onCloseCategoryDetail: () => void;
  burstModalVisible: boolean;
  burstSource: BurstSourceItem | null;
  burstMode: 'INCOME' | 'EXPENSE';
  burstEvents: BurstEventItem[];
  onCloseBurst: () => void;
  onEditBurstSchedule: (source: BurstSourceItem) => void;
  onRefresh: () => Promise<void>;
  refetchAll: () => void;
}

export function PaychecksModalManager({
  formModalVisible,
  formMode,
  sourceToEdit,
  onCloseForm,
  markPaidEvent,
  onCloseMarkPaid,
  overrideModalVisible,
  eventToOverride,
  onCloseOverride,
  transferModalVisible,
  activeTransfer,
  pools,
  onCloseTransfer,
  categoryModalVisible,
  activeCategoryDetail,
  onCloseCategoryDetail,
  burstModalVisible,
  burstSource,
  burstMode,
  burstEvents,
  onCloseBurst,
  onEditBurstSchedule,
  onRefresh,
  refetchAll,
}: PaychecksModalManagerProps) {
  const markExpensePaidMut = trpc.markExpensePaid.useMutation();
  const markIncomeReceivedMut = trpc.markIncomeReceived.useMutation();
  const deleteIncomeEventMut = trpc.deleteIncomeEvent.useMutation();
  const deleteExpenseEventMut = trpc.deleteExpenseEvent.useMutation();
  const deleteTransferEventMut = trpc.deleteTransferEvent.useMutation();
  const executeTransferMut = trpc.executeTransferEvent.useMutation();
  const updateTransferMut = trpc.updateTransferEvent.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const archiveIncomeSourceMut = trpc.archiveIncomeSource.useMutation();
  const archiveExpenseSourceMut = trpc.archiveExpenseSource.useMutation();

  return (
    <>
      <IncomeExpenseFormModal
        visible={formModalVisible}
        mode={formMode}
        sourceToEdit={sourceToEdit}
        onClose={onCloseForm}
        onSuccess={refetchAll}
      />

      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={onCloseMarkPaid}
        onSuccess={refetchAll}
      />

      <EventOverrideModal
        visible={overrideModalVisible}
        eventToEdit={eventToOverride}
        onClose={onCloseOverride}
        onSuccess={refetchAll}
      />

      <MobileTransferModal
        visible={transferModalVisible}
        transfer={activeTransfer}
        pools={pools}
        onClose={onCloseTransfer}
        onSaveDraft={async (params) => {
          if (params.eventId !== 'new') {
            await updateTransferMut.mutateAsync({
              eventId: params.eventId,
              name: params.name,
              amount: params.amount,
              expectedDate: params.expectedDate,
            });
          }
          await onRefresh();
        }}
        onExecute={async (eventId, amount, name, srcId, dstId) => {
          await executeTransferMut.mutateAsync({
            eventId,
            amount,
            name,
            sourcePoolId: srcId,
            destinationPoolId: dstId,
          });
          await onRefresh();
        }}
        onDelete={async (eventId) => {
          if (eventId !== 'new') {
            await deleteTransferEventMut.mutateAsync({ eventId });
            await onRefresh();
          }
        }}
      />

      {activeCategoryDetail && (
        <MobileCategoryDetailModal
          visible={categoryModalVisible}
          poolId={activeCategoryDetail.poolId}
          poolName={activeCategoryDetail.poolName}
          poolType={activeCategoryDetail.poolType}
          currentBalance={activeCategoryDetail.currentBalance}
          targetAmount={activeCategoryDetail.targetAmount}
          events={activeCategoryDetail.events}
          onClose={onCloseCategoryDetail}
          onMarkPaid={async (eventId, amount, date) => {
            await markExpensePaidMut.mutateAsync({ eventId, amount, date });
            await onRefresh();
          }}
        />
      )}

      <MobileBurstModal
        visible={burstModalVisible}
        mode={burstMode}
        source={burstSource}
        events={burstEvents}
        onClose={onCloseBurst}
        onEditSchedule={onEditBurstSchedule}
        onArchiveSchedule={async (src) => {
          if (burstMode === 'INCOME') {
            await archiveIncomeSourceMut.mutateAsync({ id: src.id });
          } else {
            await archiveExpenseSourceMut.mutateAsync({ id: src.id });
          }
          onCloseBurst();
          await onRefresh();
        }}
        onMarkPaid={async (eventId, amount, date) => {
          if (burstMode === 'INCOME') {
            await markIncomeReceivedMut.mutateAsync({
              eventId,
              actualAmount: amount,
              recordedAt: date,
            });
          } else {
            await markExpensePaidMut.mutateAsync({ eventId, amount, date });
          }
          await onRefresh();
        }}
        onDeleteEvent={async (eventId) => {
          if (burstMode === 'INCOME') {
            await deleteIncomeEventMut.mutateAsync({ eventId });
          } else {
            await deleteExpenseEventMut.mutateAsync({ eventId });
          }
          await onRefresh();
        }}
        onUpdateEvent={async (eventId, amount, date) => {
          await overrideEventMut.mutateAsync({
            eventId,
            eventType: burstMode,
            expectedAmount: amount,
            expectedDate: date,
          });
          await onRefresh();
        }}
      />
    </>
  );
}
