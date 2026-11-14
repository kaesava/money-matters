import React, { useState } from 'react';
import { showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { IncomeExpenseFormModal, SourceToEdit } from '../IncomeExpenseFormModal';
import { MarkPaidModal, MarkPaidEvent } from '../MarkPaidModal';
import { EventOverrideModal, EventToOverride } from '../EventOverrideModal';
import { MobileTransferModal, TransferEventData } from './MobileTransferModal';
import {
  MobileCategoryDetailSheet,
  MobileCategoryDetailItem,
} from '@money-matters/ui/mobile';
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
  eventToOverride: EventToOverride | null;
  onCloseOverride: () => void;
  onDeleteOverride?: (event: { id: string; eventType: 'INCOME' | 'EXPENSE'; name: string }) => void;
  onNavigateToSchedule?: (type: 'INCOME' | 'EXPENSE', id: string) => void;
  transferModalVisible: boolean;
  activeTransfer: TransferEventData | null;
  pools: { id: string; name: string; envelopeType?: string; poolType?: string; currentBalance?: string | number | null; isPrivate?: boolean | null }[];
  onCloseTransfer: () => void;
  categoryModalVisible: boolean;
  activeCategoryDetail: {
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: MobileCategoryDetailItem[];
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
  onDeleteOverride,
  onNavigateToSchedule,
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
  const [localMarkPaidEvent, setLocalMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const effectiveMarkPaidEvent = markPaidEvent || localMarkPaidEvent;
  const markIncomeReceivedMut = trpc.markIncomeReceived.useMutation();
  const deleteIncomeEventMut = trpc.deleteIncomeEvent.useMutation();
  const deleteExpenseEventMut = trpc.deleteExpenseEvent.useMutation();
  const deleteTransferEventMut = trpc.deleteTransferEvent.useMutation();
  const executeTransferMut = trpc.executeTransferEvent.useMutation();
  const updateTransferMut = trpc.updateTransferEvent.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const archiveIncomeSourceMut = trpc.archiveIncomeSource.useMutation();
  const archiveEnvelopeMut = trpc.archiveEnvelope.useMutation();

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
        visible={!!effectiveMarkPaidEvent}
        event={effectiveMarkPaidEvent}
        onClose={() => {
          setLocalMarkPaidEvent(null);
          onCloseMarkPaid();
        }}
        onSuccess={refetchAll}
      />

      <EventOverrideModal
        visible={overrideModalVisible}
        eventToEdit={eventToOverride}
        onClose={onCloseOverride}
        onSuccess={refetchAll}
        onNavigateToSchedule={onNavigateToSchedule}
        onDelete={(evt) => {
          if (onDeleteOverride) {
            onDeleteOverride(evt);
          } else if (evt.eventType === 'INCOME') {
            showMobileConfirm({
              title: t('payday.deleteIncomeEvent'),
              message: t('payday.deleteIncomeEventConfirm'),
              confirmText: t('common.delete'),
              isDestructive: true,
              onConfirm: () => {
                deleteIncomeEventMut.mutate({ eventId: evt.id }, { onSuccess: refetchAll });
              },
            });
          } else {
            showMobileConfirm({
              title: t('payday.deleteExpenseEvent'),
              message: t('payday.deleteExpenseEventConfirm', { name: evt.name || t('common.expense') }),
              confirmText: t('common.delete'),
              isDestructive: true,
              onConfirm: () => {
                deleteExpenseEventMut.mutate({ eventId: evt.id }, { onSuccess: refetchAll });
              },
            });
          }
        }}
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
        <MobileCategoryDetailSheet
          visible={categoryModalVisible}
          poolId={activeCategoryDetail.poolId}
          poolName={activeCategoryDetail.poolName}
          poolType={activeCategoryDetail.poolType}
          currentBalance={activeCategoryDetail.currentBalance}
          targetAmount={activeCategoryDetail.targetAmount}
          upcomingEvents={activeCategoryDetail.events}
          onClose={onCloseCategoryDetail}
          onMarkPaid={async (eventId, amount, date) => {
            const evt = activeCategoryDetail.events.find((e) => e.id === eventId);
            onCloseCategoryDetail();
            setLocalMarkPaidEvent({
              id: eventId,
              name: evt?.name || activeCategoryDetail.poolName,
              expectedAmount: parseFloat(amount) || 0,
              expectedDate: evt?.dueDate || date,
              categoryId: activeCategoryDetail.poolId,
              poolId: activeCategoryDetail.poolId,
            });
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
            await archiveEnvelopeMut.mutateAsync({ envelopeId: src.id });
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
            await onRefresh();
          } else {
            const evt = burstEvents.find((e) => e.id === eventId);
            onCloseBurst();
            setLocalMarkPaidEvent({
              id: eventId,
              name: evt?.name || burstSource?.name || t('common.expense'),
              expectedAmount: parseFloat(amount) || 0,
              expectedDate: evt?.expectedDate || date,
              categoryId: burstSource?.id,
              poolId: burstSource?.id,
            });
          }
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
