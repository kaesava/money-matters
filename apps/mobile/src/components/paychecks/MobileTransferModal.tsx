import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  MobileModalDialog,
  FormErrorBanner,
  useMobileToast,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatIsoDate } from '../../lib/format';
import { TransferFormFields } from './transfer/TransferFormFields';
import { TransferModalActions } from './transfer/TransferModalActions';

export interface TransferEventData {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
}

export interface PoolOption {
  id: string;
  name: string;
  poolType?: string;
  currentBalance?: string | number | null;
  isPrivate?: boolean | null;
}

export interface MobileTransferModalProps {
  visible: boolean;
  transfer: TransferEventData | null;
  pools: PoolOption[];
  onClose: () => void;
  onSaveDraft?: (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
    sourcePoolId?: string;
    destinationPoolId?: string;
  }) => Promise<void>;
  onExecute?: (
    eventId: string,
    amount: string,
    name?: string,
    sourcePoolId?: string,
    destinationPoolId?: string
  ) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export function MobileTransferModal({
  visible,
  transfer,
  pools,
  onClose,
  onSaveDraft,
  onExecute,
  onDelete,
}: MobileTransferModalProps) {
  const toast = useMobileToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState(() => formatIsoDate(new Date()));
  const [sourcePoolId, setSourcePoolId] = useState<string>('');
  const [destinationPoolId, setDestinationPoolId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (transfer && visible) {
      setName(transfer.name || t('common.transfer'));
      setAmount(parseFloat(transfer.expectedAmount || '0').toFixed(2));
      setExpectedDate(formatIsoDate(transfer.expectedDate || new Date()));
      setSourcePoolId(transfer.sourcePoolId || '');
      setDestinationPoolId(transfer.destinationPoolId || '');
      setErrorMsg('');
    }
  }, [transfer, visible]);

  if (!visible || !transfer) return null;

  const validate = (): number | null => {
    const numAmt = parseFloat(amount);
    if (!name.trim()) {
      setErrorMsg(t('drawers.quickExpense.nameRequired'));
      return null;
    }
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg(t('drawers.quickExpense.invalidAmount'));
      return null;
    }
    if (sourcePoolId && destinationPoolId && sourcePoolId === destinationPoolId) {
      setErrorMsg(t('drawers.quickExpense.poolsDifferent'));
      return null;
    }
    return numAmt;
  };

  const handleSave = async () => {
    const numAmt = validate();
    if (numAmt === null) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      if (onSaveDraft) {
        await onSaveDraft({
          eventId: transfer.id,
          name: name.trim(),
          amount: numAmt.toFixed(2),
          expectedDate,
          sourcePoolId: sourcePoolId || undefined,
          destinationPoolId: destinationPoolId || undefined,
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteNow = async () => {
    const numAmt = validate();
    if (numAmt === null) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      if (onExecute) {
        await onExecute(
          transfer.id,
          numAmt.toFixed(2),
          name.trim(),
          sourcePoolId || undefined,
          destinationPoolId || undefined
        );
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    showMobileConfirm({
      title: t('home.deleteTransferTitle'),
      message: t('home.deleteTransferMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          if (onDelete) {
            await onDelete(transfer.id);
          }
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common.error'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('common.transfer')}
      subtitle={transfer.name || undefined}
    >
      <View style={styles.formContainer}>
        <FormErrorBanner message={errorMsg} />

        <TransferFormFields
          name={name}
          setName={setName}
          amount={amount}
          setAmount={setAmount}
          expectedDate={expectedDate}
          setExpectedDate={setExpectedDate}
          sourcePoolId={sourcePoolId}
          setSourcePoolId={setSourcePoolId}
          destinationPoolId={destinationPoolId}
          setDestinationPoolId={setDestinationPoolId}
          pools={pools}
          onFieldChange={() => {
            if (errorMsg) setErrorMsg('');
          }}
        />

        <TransferModalActions
          submitting={submitting}
          onSaveDraft={handleSave}
          onExecuteNow={handleExecuteNow}
          onDelete={onDelete ? handleDelete : undefined}
        />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 12,
    paddingBottom: 8,
  },
});
