import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileDatePickerField,
  AmountInput,
  MobileInput,
  FormErrorBanner,
  FormLabel,
  MobilePoolPicker,
  useMobileToast,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatIsoDate } from '../../lib/format';

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
  isPrivate?: boolean;
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

  const handleSave = async () => {
    const numAmt = parseFloat(amount);
    if (!name.trim()) {
      setErrorMsg(t('drawers.quickExpense.nameRequired'));
      return;
    }
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg(t('drawers.quickExpense.invalidAmount'));
      return;
    }
    if (sourcePoolId && destinationPoolId && sourcePoolId === destinationPoolId) {
      setErrorMsg(t('drawers.quickExpense.poolsDifferent'));
      return;
    }

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
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg(t('drawers.quickExpense.invalidAmount'));
      return;
    }
    if (sourcePoolId && destinationPoolId && sourcePoolId === destinationPoolId) {
      setErrorMsg(t('drawers.quickExpense.poolsDifferent'));
      return;
    }

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

  const formattedPools = pools.map((p) => ({
    id: p.id,
    name: p.name,
    poolType: p.poolType,
    currentBalance: p.currentBalance ?? undefined,
    isPrivate: p.isPrivate,
  }));

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('common.transfer')}
      subtitle={transfer.name || undefined}
    >
      <View style={styles.formContainer}>
        <FormErrorBanner message={errorMsg} />

        <MobileInput
          label={t('common.name')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (errorMsg) setErrorMsg('');
          }}
          placeholder={t('common.transfer')}
        />

        <AmountInput
          label={t('common.amount')}
          required
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            if (errorMsg) setErrorMsg('');
          }}
        />

        <MobileDatePickerField
          label={t('common.date')}
          required
          value={expectedDate}
          onChange={(v) => {
            setExpectedDate(v);
            if (errorMsg) setErrorMsg('');
          }}
        />

        <View style={styles.pickerSection}>
          <FormLabel label={t('drawers.quickExpense.fromPool')} />
          <MobilePoolPicker
            pools={formattedPools}
            selectedPoolId={sourcePoolId}
            allowCategorySelection={false}
            placeholder={t('common.selectPool')}
            onSelectPool={(pId) => {
              setSourcePoolId(pId);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </View>

        <View style={styles.pickerSection}>
          <FormLabel label={t('drawers.quickExpense.toPoolDestination')} />
          <MobilePoolPicker
            pools={formattedPools}
            selectedPoolId={destinationPoolId}
            allowCategorySelection={false}
            placeholder={t('common.selectPool')}
            onSelectPool={(pId) => {
              setDestinationPoolId(pId);
              if (errorMsg) setErrorMsg('');
            }}
          />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.saveDraftBtn}
            onPress={handleSave}
            disabled={submitting}
          >
            <Text style={styles.saveDraftText}>{t('common.save')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.executeBtn}
            onPress={handleExecuteNow}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.executeBtnText}>{t('common.transfer')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={submitting}
            style={styles.deleteLink}
          >
            <Feather name="trash-2" size={14} color="#94A3B8" />
            <Text style={styles.deleteLinkText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  formContainer: {
    gap: 12,
    paddingBottom: 8,
  },
  pickerSection: {
    gap: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveDraftBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  executeBtn: {
    flex: 1,
    backgroundColor: D.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  deleteLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
