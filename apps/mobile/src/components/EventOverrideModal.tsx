import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui';
import { trpc } from '../lib/trpc';

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
  const [expectedDate, setExpectedDate] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');

  useEffect(() => {
    if (eventToEdit) {
      setExpectedDate(eventToEdit.expectedDate.split('T')[0] ?? eventToEdit.expectedDate);
      setExpectedAmount(eventToEdit.expectedAmount);
    }
  }, [eventToEdit]);

  const overrideEventMut = trpc.overrideEvent.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = async () => {
    if (!eventToEdit || !expectedDate || !expectedAmount || parseFloat(expectedAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid date (YYYY-MM-DD) and positive amount.');
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
      title="Override Event"
      subtitle={eventToEdit ? `Edit upcoming event: ${eventToEdit.name}` : ''}
    >
      <View style={styles.formGroup}>
        <Text style={styles.label}>Expected Date (YYYY-MM-DD)</Text>
        <TextInput
          value={expectedDate}
          onChangeText={setExpectedDate}
          placeholder="2026-08-01"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Expected Amount ($)</Text>
        <TextInput
          value={expectedAmount}
          onChangeText={setExpectedAmount}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isPending}
        style={styles.submitBtn}
        activeOpacity={0.8}
      >
        {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save Event Override</Text>}
      </TouchableOpacity>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  formGroup: { gap: 6, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: D.colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: D.radius.md,
    padding: 12,
    fontSize: 15,
    color: D.colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: '#00B4A6',
    paddingVertical: 14,
    borderRadius: D.radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
