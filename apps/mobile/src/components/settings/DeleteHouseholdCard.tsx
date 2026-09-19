import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { showMobileConfirm, useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';

interface DeleteHouseholdCardProps {
  householdName: string;
  isOwner: boolean;
  partnerEmail?: string | null;
  onDeleted: () => void;
}

export function DeleteHouseholdCard({
  householdName,
  isOwner,
  partnerEmail,
  onDeleted,
}: DeleteHouseholdCardProps) {
  const toast = useMobileToast();
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deleteAccountMutation = trpc.deleteMyAccount.useMutation();

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim().toLowerCase() !== householdName.trim().toLowerCase()) {
      return;
    }

    showMobileConfirm({
      title: t('privacy.deleteHouseholdTitle'),
      message: t('privacy.deleteHouseholdNotice'),
      confirmText: 'Erase Household',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await deleteAccountMutation.mutateAsync();
          toast.success(
            t('privacy.deletionConfirmedBody'),
            t('privacy.deletionConfirmedTitle')
          );
          onDeleted();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Account erasure failed.', 'Deletion Error');
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return (
    <View style={styles.dangerBox}>
      <Text style={styles.dangerTitle}>{t('privacy.deleteHouseholdTitle')}</Text>
      <Text style={styles.dangerSubtitle}>{t('privacy.deleteHouseholdNotice')}</Text>

      {!isOwner ? (
        <Text style={styles.ownerOnlyText}>
          {t('privacy.ownerOnlyDeleteNotice', { email: partnerEmail || 'the owner' })}
        </Text>
      ) : (
        <>
          <TextInput
            style={styles.dangerInput}
            placeholder={`Type ${householdName} to confirm`}
            placeholderTextColor="#FDA4AF"
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
          />

          <TouchableOpacity
            style={[
              styles.deleteBtn,
              (deleteConfirmText.trim().toLowerCase() !== householdName.trim().toLowerCase() || isSubmitting) && { opacity: 0.5 },
            ]}
            disabled={deleteConfirmText.trim().toLowerCase() !== householdName.trim().toLowerCase() || isSubmitting}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>{t('privacy.confirmDeleteHouseholdCta')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dangerBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9F1239',
  },
  dangerSubtitle: {
    fontSize: 10,
    color: '#BE123C',
    lineHeight: 14,
  },
  ownerOnlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9F1239',
  },
  dangerInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#9F1239',
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
