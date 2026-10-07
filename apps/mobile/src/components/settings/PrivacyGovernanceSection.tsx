import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import JSZip from 'jszip';
import { useMobileToast, DESIGN_TOKENS, InfoTooltip, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { buildExportFileName } from '@money-matters/types';
import { trpc } from '../../lib/trpc';
import { formatIsoDate } from '../../lib/format';

export function PrivacyGovernanceSection() {
  const toast = useMobileToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportQuery = trpc.exportMyData.useQuery(undefined, { enabled: false });

  const handleOpenPrivacyPolicy = async () => {
    const privacyUrl = 'https://moneymatters.kaesava.au/privacy';
    try {
      await WebBrowser.openBrowserAsync(privacyUrl);
    } catch {
      await Linking.openURL(privacyUrl).catch(() => {});
    }
  };

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
        const dateStr = formatIsoDate(new Date());
        const exportFileName = buildExportFileName(dateStr);
        const fileUri = `${FileSystem.documentDirectory}${exportFileName}`;

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/zip',
            dialogTitle: exportFileName,
            UTI: 'public.zip-archive',
          });
        }
        toast.success(t('toasts.exportSuccess'));
      } else {
        toast.error(t('common.errorTryAgain'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Title & InfoTooltip Row */}
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{t('privacy.title')}</Text>
        <InfoTooltip
          title={t('privacy.title')}
          content={t('privacy.aussiePrivacyGuarantee')}
        />
      </View>

      <Text style={styles.cardSubtitle}>{t('privacy.aussiePrivacyDetail')}</Text>

      {/* Public Privacy Policy Link */}
      <TouchableOpacity
        onPress={handleOpenPrivacyPolicy}
        style={styles.policyLinkRow}
        activeOpacity={0.7}
      >
        <Text style={styles.policyLinkText}>
          {t('privacy.viewPublicPrivacyPolicyLink')}
        </Text>
      </TouchableOpacity>

      {/* Export Data Action Button */}
      <View style={styles.btnRow}>
        <MobileButton
          variant="secondary"
          label={t('privacy.exportZipButton')}
          onPress={handleExportData}
          loading={isExporting}
          disabled={isExporting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 17,
  },
  policyLinkRow: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  policyLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  btnRow: {
    alignItems: 'flex-start',
    marginTop: 2,
  },
});
