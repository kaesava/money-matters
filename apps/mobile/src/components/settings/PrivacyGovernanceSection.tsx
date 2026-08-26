import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { trpc, setActiveSessionToken } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import * as SecureStore from 'expo-secure-store';

export function PrivacyGovernanceSection() {
  const router = useRouter();
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [leaveConfirmText, setLeaveConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });
  const deleteAccountMutation = trpc.deleteMyAccount.useMutation();
  const leaveHouseholdMutation = trpc.leaveMyHousehold.useMutation();

  const gov = govQuery.data;

  const handleExportData = async () => {
    try {
      const res = await exportQuery.refetch();
      if (res.data) {
        Alert.alert(
          t('privacy.exportDataTitle'),
          `Data export ready! Exported at: ${res.data.exportedAt}`
        );
      }
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'Could not export data.');
    }
  };

  const handleSignOutAndRedirect = async () => {
    await authClient.signOut();
    await SecureStore.deleteItemAsync('money-matters_session_token');
    await SecureStore.deleteItemAsync('money-matters-session-token');
    setActiveSessionToken(null);
    router.replace('/(auth)/sign-in');
  };

  const handleDeleteAccount = () => {
    if (!gov) return;
    if (deleteConfirmText.trim().toLowerCase() !== gov.householdName.trim().toLowerCase()) {
      Alert.alert('Confirmation Required', `Type ${gov.householdName} to confirm.`);
      return;
    }

    Alert.alert(
      t('privacy.deleteHouseholdTitle'),
      t('privacy.deleteHouseholdNotice'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Household',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteAccountMutation.mutateAsync();
              Alert.alert(
                t('privacy.deletionConfirmedTitle'),
                t('privacy.deletionConfirmedBody'),
                [{ text: 'OK', onPress: handleSignOutAndRedirect }]
              );
            } catch (err) {
              Alert.alert('Deletion Error', err instanceof Error ? err.message : 'Account erasure failed.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveHousehold = () => {
    if (leaveConfirmText.trim().toUpperCase() !== 'LEAVE HOUSEHOLD') {
      Alert.alert('Confirmation Required', 'Type LEAVE HOUSEHOLD to confirm.');
      return;
    }

    Alert.alert(
      t('privacy.leaveHouseholdTitle'),
      'Are you sure you want to leave this household?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Household',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await leaveHouseholdMutation.mutateAsync();
              Alert.alert(
                'Household Left',
                t('privacy.leftHouseholdSuccess'),
                [{ text: 'OK', onPress: handleSignOutAndRedirect }]
              );
            } catch (err) {
              Alert.alert('Leave Error', err instanceof Error ? err.message : 'Leaving household failed.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🛡️ {t('privacy.title')}</Text>
      <Text style={styles.cardSubtitle}>{t('privacy.aussiePrivacyDetail')}</Text>

      <TouchableOpacity style={styles.exportBtn} onPress={handleExportData} activeOpacity={0.8}>
        <Text style={styles.exportBtnText}>{t('privacy.exportButton')}</Text>
      </TouchableOpacity>

      {/* Leave Household section */}
      {gov && (!gov.isSoleOwner || !gov.isOwner) && (
        <View style={styles.amberBox}>
          <Text style={styles.amberTitle}>🚪 {t('privacy.leaveHouseholdTitle')}</Text>
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
      )}

      {/* Delete Household section */}
      <View style={styles.dangerBox}>
        <Text style={styles.dangerTitle}>⚠️ {t('privacy.deleteHouseholdTitle')}</Text>
        <Text style={styles.dangerSubtitle}>{t('privacy.deleteHouseholdNotice')}</Text>

        {gov && !gov.isOwner ? (
          <Text style={styles.ownerOnlyText}>
            ℹ️ {t('privacy.ownerOnlyDeleteNotice', { email: gov.partnerEmail || 'the owner' })}
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.dangerInput}
              placeholder={gov ? `Type ${gov.householdName} to confirm` : 'Type household name to confirm'}
              placeholderTextColor="#FDA4AF"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
            />

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                (!gov || deleteConfirmText.trim().toLowerCase() !== gov.householdName.trim().toLowerCase() || isSubmitting) && { opacity: 0.5 },
              ]}
              disabled={!gov || deleteConfirmText.trim().toLowerCase() !== gov.householdName.trim().toLowerCase() || isSubmitting}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteBtnText}>{t('privacy.confirmDeleteHouseholdCta')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  exportBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
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
