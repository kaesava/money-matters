import { useState } from 'react';
import { SourceToEdit } from '../../IncomeExpenseFormModal';
import { MarkPaidEvent } from '../../MarkPaidModal';
import { TransferEventData } from '../MobileTransferModal';
import { CategoryScheduledEvent } from '../MobileCategoryDetailModal';
import { BurstSourceItem } from '../MobileBurstModal';

export function usePaychecksModalController() {
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [eventToOverride, setEventToOverride] = useState<{
    id: string;
    eventType: 'INCOME' | 'EXPENSE';
    name: string;
    expectedDate: string;
    expectedAmount: string;
  } | null>(null);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<TransferEventData | null>(null);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: CategoryScheduledEvent[];
  } | null>(null);

  const [burstModalVisible, setBurstModalVisible] = useState(false);
  const [burstSource, setBurstSource] = useState<BurstSourceItem | null>(null);
  const [burstMode, setBurstMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  return {
    formModalVisible,
    setFormModalVisible,
    formMode,
    setFormMode,
    sourceToEdit,
    setSourceToEdit,
    overrideModalVisible,
    setOverrideModalVisible,
    eventToOverride,
    setEventToOverride,
    markPaidEvent,
    setMarkPaidEvent,
    transferModalVisible,
    setTransferModalVisible,
    activeTransfer,
    setActiveTransfer,
    categoryModalVisible,
    setCategoryModalVisible,
    activeCategoryDetail,
    setActiveCategoryDetail,
    burstModalVisible,
    setBurstModalVisible,
    burstSource,
    setBurstSource,
    burstMode,
    setBurstMode,
  };
}
