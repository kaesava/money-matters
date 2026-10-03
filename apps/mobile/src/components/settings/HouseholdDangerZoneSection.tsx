import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMobileToast, MobileButton, TypedConfirmDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import * as SecureStore from 'expo-secure-store';
import { trpc, setActiveSessionToken, setActiveTenantId } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

export function HouseholdDangerZoneSection() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const deleteMutation = trpc.deleteMyAccount.useMutation();
  const leaveMutation = trpc.leaveMyHousehold.useMutation();

  const [activeModal, setActiveModal] = useState<'LEAVE' | 'DELETE' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gov = govQuery.data;
  if (!gov) return null;

  const handleSignOutAndExit = async (hasOtherHousehold: boolean) => {
    await authClient.signOut();
    await SecureStore.deleteItemAsync('money-matters_session_token');
    await SecureStore.deleteItemAsync('money-matters-session-token');
    await SecureStore.deleteItemAsync('money_matters_active_tenant_id').catch(() => {});
    setActiveSessionToken(null);
    setActiveTenantId(null);
    await utils.invalidate().catch(() => {});
    router.replace((hasOtherHousehold ? '/(auth)/sign-in' : '/(auth)/sign-in') as never);
  };

  const handleLeaveHousehold = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await leaveMutation.mutateAsync();
      toast.success(t('privacy.leftHouseholdSuccess'), t('common.success'));
      setActiveModal(null);
      await handleSignOutAndExit(Boolean(res.hasOtherHousehold));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'), t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteMutation.mutateAsync();
      toast.success(t('privacy.deletionConfirmedBody'), t('privacy.deletionConfirmedTitle'));
      setActiveModal(null);
      await handleSignOutAndExit(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.errorTryAgain'), t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveWarningText = gov.leaveWarning
    ? t(gov.leaveWarning.key, gov.leaveWarning.params)
    : '';

  const deleteWarningText = gov.deleteWarning
    ? t(gov.deleteWarning.key, gov.deleteWarning.params)
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Feather name="alert-triangle" size={16} color="#B91C1C" />
        <Text style={styles.cardTitle}>{t('settings.dangerZone.title')}</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        {t('settings.dangerZone.subtitle')}
      </Text>

      <View style={styles.btnRow}>
        {(!gov.isSoleOwner || !gov.isOwner) && (
          <MobileButton
            variant="secondary"
            label={t('settings.dangerZone.leaveCta')}
            onPress={() => setActiveModal('LEAVE')}
          />
        )}

        {gov.isOwner && (
          <MobileButton
            variant="danger"
            label={t('settings.dangerZone.deleteCta')}
            onPress={() => setActiveModal('DELETE')}
          />
        )}
      </View>

      {/* Leave Household Modal */}
      <TypedConfirmDialog
        visible={activeModal === 'LEAVE'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleLeaveHousehold}
        title={t('privacy.leaveHouseholdModalTitle')}
        subtitle={t('privacy.leaveHouseholdModalSubtitle')}
        confirmPhrase={t('settings.dangerZone.leaveConfirmPhrase')}
        confirmLabel={t('settings.dangerZone.leaveConfirmLabel')}
        confirmButtonText={t('privacy.confirmLeaveCta')}
        variant="danger"
      >
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{leaveWarningText}</Text>
        </View>
      </TypedConfirmDialog>

      {/* Delete Household Modal */}
      <TypedConfirmDialog
        visible={activeModal === 'DELETE'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleDeleteHousehold}
        title={t('privacy.deleteHouseholdModalTitle')}
        subtitle={t('privacy.deleteHouseholdModalTooltip')}
        confirmPhrase={gov.householdName}
        confirmLabel={t('settings.dangerZone.deleteConfirmLabel', {
          name: gov.householdName,
        })}
        confirmButtonText={t('privacy.confirmDeleteHouseholdCta')}
        variant="danger"
      >
        <View style={styles.dangerBox}>
          <Text style={styles.dangerText}>{t('privacy.deleteHouseholdNotice')}</Text>
          {deleteWarningText ? (
            <Text style={styles.dangerSubtext}>⚠️ {deleteWarningText}</Text>
          ) : null}
        </View>
      </TypedConfirmDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B91C1C',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '600',
  },
  dangerBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 6,
  },
  dangerText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
    fontWeight: '600',
  },
  dangerSubtext: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 4,
  },
});
