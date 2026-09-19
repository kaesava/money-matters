import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc, setActiveSessionToken } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatIsoDate } from '../../lib/format';
import * as SecureStore from 'expo-secure-store';
import { DeleteHouseholdCard } from './DeleteHouseholdCard';
import { LeaveHouseholdCard } from './LeaveHouseholdCard';

export function PrivacyGovernanceSection() {
  const router = useRouter();
  const toast = useMobileToast();
  const [isExporting, setIsExporting] = useState(false);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });
  const gov = govQuery.data;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await exportQuery.refetch();
      if (res.data?.csvFiles) {
        const zip = new JSZip();
        Object.entries(res.data.csvFiles).forEach(([fileName, content]) => {
          if (typeof content === 'string') {
            zip.file(fileName, content);
          }
        });

        const base64 = await zip.generateAsync({ type: 'base64' });
        const fileUri = `${FileSystem.documentDirectory}MoneyMatters-Export-${formatIsoDate(new Date())}.zip`;

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/zip',
            dialogTitle: 'Export Money Matters Backup',
            UTI: 'public.zip-archive',
          });
        } else {
          toast.info(`Backup saved to ${fileUri}`, t('privacy.exportDataTitle'));
        }
      } else {
        toast.error('No export data returned.', t('common.error'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export data.', 'Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOutAndRedirect = async () => {
    await authClient.signOut();
    await SecureStore.deleteItemAsync('money-matters_session_token');
    await SecureStore.deleteItemAsync('money-matters-session-token');
    setActiveSessionToken(null);
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('privacy.title')}</Text>
      <Text style={styles.cardSubtitle}>{t('privacy.aussiePrivacyDetail')}</Text>

      <TouchableOpacity
        style={[styles.exportBtn, isExporting && { opacity: 0.6 }]}
        onPress={handleExportData}
        disabled={isExporting}
        activeOpacity={0.8}
      >
        {isExporting ? (
          <View style={styles.exportingRow}>
            <ActivityIndicator size="small" color="#334155" />
            <Text style={styles.exportBtnText}>Creating Zipped Archive...</Text>
          </View>
        ) : (
          <Text style={styles.exportBtnText}>{t('privacy.exportButton')}</Text>
        )}
      </TouchableOpacity>

      {/* Leave Household section */}
      {gov && (!gov.isSoleOwner || !gov.isOwner) && (
        <LeaveHouseholdCard onLeft={handleSignOutAndRedirect} />
      )}

      {/* Delete Household section */}
      {gov && (
        <DeleteHouseholdCard
          householdName={gov.householdName}
          isOwner={gov.isOwner}
          partnerEmail={gov.partnerEmail}
          onDeleted={handleSignOutAndRedirect}
        />
      )}
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
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
