import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { showMobileConfirm, useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';

interface LeaveHouseholdCardProps {
  onLeft: () => void;
}

export function LeaveHouseholdCard({ onLeft }: LeaveHouseholdCardProps) {
  const toast = useMobileToast();
  const [leaveConfirmText, setLeaveConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const leaveHouseholdMutation = trpc.leaveMyHousehold.useMutation();

  const handleLeaveHousehold = () => {
    if (leaveConfirmText.trim().toUpperCase() !== 'LEAVE HOUSEHOLD') {
      return;
    }

    showMobileConfirm({
      title: t('privacy.leaveHouseholdTitle'),
      message: 'Are you sure you want to leave this household?',
      confirmText: 'Leave Household',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await leaveHouseholdMutation.mutateAsync();
          toast.success(
            t('privacy.leftHouseholdSuccess'),
            'Household Left'
          );
          onLeft();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Leaving household failed.', 'Leave Error');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return (
    <View style={styles.amberBox}>
      <Text style={styles.amberTitle}>{t('privacy.leaveHouseholdTitle')}</Text>
      <Text style={styles.amberSubtitle}>
        Type LEAVE HOUSEHOLD below to confirm leaving this household budget.
      </Text>

      <TextInput
        style={styles.amberInput}
        placeholder="Type LEAVE HOUSEHOLD to confirm"
        placeholderTextColor="#F59E0B"
        value={leaveConfirmText}
        onChangeText={setLeaveConfirmText}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        style={[
          styles.leaveBtn,
          (leaveConfirmText.trim().toUpperCase() !== 'LEAVE HOUSEHOLD' || isSubmitting) && { opacity: 0.5 },
        ]}
        disabled={leaveConfirmText.trim().toUpperCase() !== 'LEAVE HOUSEHOLD' || isSubmitting}
        onPress={handleLeaveHousehold}
        activeOpacity={0.8}
      >
        <Text style={styles.leaveBtnText}>{t('privacy.confirmLeaveCta')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  amberBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  amberTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  amberSubtitle: {
    fontSize: 10,
    color: '#B45309',
    lineHeight: 14,
  },
  amberInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  leaveBtn: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  leaveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
