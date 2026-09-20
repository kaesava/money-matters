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
}

export function EventOverrideModal({ visible, eventToEdit, onClose, onSuccess }: EventOverrideModalProps) {
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
  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible && !!eventToEdit}
      onClose={onClose}
      title={t('modals.eventOverride.title')}
      subtitle={eventToEdit ? t('modals.eventOverride.subtitle', { name: eventToEdit.name }) : ''}
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

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isPending}
        style={styles.submitBtn}
        activeOpacity={0.8}
      >
        {isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: D.radius.md,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
