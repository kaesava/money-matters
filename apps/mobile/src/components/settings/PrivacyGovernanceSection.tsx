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
  const [isDeleting, setIsDeleting] = useState(false);

  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });
  const deleteAccountMutation = trpc.deleteMyAccount.useMutation();

  const handleExportData = async () => {
    try {
      const res = await exportQuery.refetch();
      if (res.data) {
        Alert.alert(
          t('privacy.exportDataTitle'),
          `Data export ready! Generated at: ${res.data.exportedAt}`
        );
      }
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'Could not export data.');
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim() !== 'DELETE') {
      Alert.alert('Confirmation Required', t('privacy.confirmDeletePrompt'));
      return;
    }

    Alert.alert(
      t('privacy.deleteAccountTitle'),
      t('privacy.deleteWarning'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccountMutation.mutateAsync();
              await authClient.signOut();
              await SecureStore.deleteItemAsync('money-matters_session_token');
              await SecureStore.deleteItemAsync('money-matters-session-token');
              setActiveSessionToken(null);
              Alert.alert(
                t('privacy.deletionConfirmedTitle'),
                t('privacy.deletionConfirmedBody'),
                [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
              );
            } catch (err) {
              Alert.alert('Deletion Error', err instanceof Error ? err.message : 'Account erasure failed.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🛡️ {t('privacy.title')}</Text>
      <Text style={styles.cardSubtitle}>{t('privacy.dataMinimizationBody')}</Text>

      <TouchableOpacity style={styles.exportBtn} onPress={handleExportData} activeOpacity={0.8}>
        <Text style={styles.exportBtnText}>{t('privacy.exportButton')}</Text>
      </TouchableOpacity>

      <View style={styles.dangerBox}>
        <Text style={styles.dangerTitle}>⚠️ {t('privacy.deleteAccountTitle')}</Text>
        <Text style={styles.dangerSubtitle}>{t('privacy.deleteWarning')}</Text>

        <TextInput
          style={styles.dangerInput}
          placeholder="Type DELETE to confirm"
          placeholderTextColor="#FDA4AF"
          value={deleteConfirmText}
          onChangeText={setDeleteConfirmText}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={[
            styles.deleteBtn,
            (deleteConfirmText.trim() !== 'DELETE' || isDeleting) && { opacity: 0.5 },
          ]}
          disabled={deleteConfirmText.trim() !== 'DELETE' || isDeleting}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnText}>{t('privacy.deleteButton')}</Text>
        </TouchableOpacity>
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
