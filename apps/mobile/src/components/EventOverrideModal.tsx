import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileDatePickerField,
  AmountInput,
  useMobileToast,
  FormErrorBanner,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';

export interface EventToOverride {
  id: string;
  eventType: 'INCOME' | 'EXPENSE';
  name: string;
  expectedDate: string;
  expectedAmount: string;
}

interface EventOverrideModalProps {
  visible: boolean;
  eventToEdit: EventToOverride | null;
  onClose: () => void;
  onSuccess?: () => void;
  onDelete?: (event: EventToOverride) => void;
}

export function EventOverrideModal({ visible, eventToEdit, onClose, onSuccess, onDelete }: EventOverrideModalProps) {
  const toast = useMobileToast();
  const [expectedDate, setExpectedDate] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (eventToEdit) {
      setExpectedDate(formatIsoDate(eventToEdit.expectedDate));
      setExpectedAmount(eventToEdit.expectedAmount);
      setErrorMsg('');
    }
  }, [eventToEdit]);

  const overrideEventMut = trpc.overrideEvent.useMutation({
    onSuccess: () => {
      toast.success(t('common.saveSuccess'));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const handleSubmit = async () => {
    if (!eventToEdit || !expectedDate || !expectedAmount || parseFloat(expectedAmount) <= 0) {
      setErrorMsg(t('drawers.quickExpense.invalidAmount'));
      return;
    }

    overrideEventMut.mutate({
      eventId: eventToEdit.id,
      eventType: eventToEdit.eventType,
      amount: parseFloat(expectedAmount).toFixed(2),
      expectedDate,
    });
  };

  const isPending = overrideEventMut.isPending;
  const handleDelete = () => {
    if (!eventToEdit || !onDelete) return;
    onDelete(eventToEdit);
    onClose();
  };

  return (
    <MobileModalDialog
      visible={visible && !!eventToEdit}
      onClose={onClose}
      title={t('modals.eventOverride.title')}
      subtitle={eventToEdit ? t('modals.eventOverride.subtitle', { name: eventToEdit.name }) : ''}
      footer={
        <View style={styles.footerRow}>
          {onDelete ? (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isPending}
              style={styles.deleteLink}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteLinkText}>{t('common.delete') || 'Delete'}</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isPending}
            style={styles.submitBtn}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <FormErrorBanner message={errorMsg} />

      <MobileDatePickerField
        label={t('common.date')}
        value={expectedDate}
        onChange={(val) => {
          setExpectedDate(val);
          if (errorMsg) setErrorMsg('');
        }}
        required
      />

      <AmountInput
        label={t('common.amount')}
        required
        value={expectedAmount}
        onChangeText={(val) => {
          setExpectedAmount(val);
          if (errorMsg) setErrorMsg('');
        }}
      />
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  deleteLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  deleteLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: D.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
