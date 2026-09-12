import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import * as SecureStore from 'expo-secure-store';
import { trpc, setActiveSessionToken } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

export function HouseholdDangerZoneSection() {
  const router = useRouter();
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const deleteMutation = trpc.deleteMyAccount.useMutation();
  const leaveMutation = trpc.leaveMyHousehold.useMutation();

  const [activeModal, setActiveModal] = useState<'LEAVE' | 'DELETE' | null>(null);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gov = govQuery.data;
  if (!gov) return null;

  const isLeaveValid = typedConfirm.trim().toUpperCase() === 'LEAVE HOUSEHOLD';
  const isDeleteValid =
    typedConfirm.trim().toLowerCase() === (gov.householdName || '').trim().toLowerCase();

  const handleSignOutAndExit = async () => {
    await authClient.signOut();
    await SecureStore.deleteItemAsync('money-matters_session_token');
    await SecureStore.deleteItemAsync('money-matters-session-token');
    setActiveSessionToken(null);
    router.replace('/(auth)/sign-in');
  };

  const handleLeaveHousehold = async () => {
    if (!isLeaveValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await leaveMutation.mutateAsync();
      setActiveModal(null);
      Alert.alert(
        'Household Left',
        t('privacy.leftHouseholdSuccess'),
        [{ text: 'OK', onPress: handleSignOutAndExit }]
      );
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed to leave household.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!isDeleteValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteMutation.mutateAsync();
      setActiveModal(null);
      Alert.alert(
        t('privacy.deletionConfirmedTitle'),
        t('privacy.deletionConfirmedBody'),
        [{ text: 'OK', onPress: handleSignOutAndExit }]
      );
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed to delete household.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Feather name="alert-triangle" size={16} color="#B91C1C" />
        <Text style={styles.cardTitle}>DANGER ZONE</Text>
      </View>
      <Text style={styles.cardSubtitle}>
        Irreversible household governance actions. Exercise extreme caution.
      </Text>

      <View style={styles.btnRow}>
        {(!gov.isSoleOwner || !gov.isOwner) && (
          <TouchableOpacity
            style={styles.leaveBtn}
            onPress={() => {
              setTypedConfirm('');
              setActiveModal('LEAVE');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.leaveBtnText}>Leave Household</Text>
          </TouchableOpacity>
        )}

        {gov.isOwner && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              setTypedConfirm('');
              setActiveModal('DELETE');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>Delete Household & Data</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {activeModal === 'LEAVE' ? (
              <>
                <Text style={styles.modalTitle}>Confirm Departure</Text>
                <Text style={styles.modalDesc}>
                  {gov.isOwner
                    ? t('privacy.leaveOwnerWarning', { email: gov.partnerEmail || 'your partner' })
                    : t('privacy.leaveMemberWarning', {
                        householdName: gov.householdName,
                        email: gov.partnerEmail || 'the owner',
                      })}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Type <Text style={styles.boldMono}>LEAVE HOUSEHOLD</Text> to confirm:
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={typedConfirm}
                    onChangeText={setTypedConfirm}
                    placeholder="LEAVE HOUSEHOLD"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmLeaveBtn,
                      (!isLeaveValid || isSubmitting) && styles.btnDisabled,
                    ]}
                    onPress={handleLeaveHousehold}
                    disabled={!isLeaveValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmLeaveBtnText}>Confirm & Leave</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitleDanger}>Delete Household & Data</Text>
                <Text style={styles.modalDesc}>
                  {t('privacy.deleteHouseholdNotice')}
                </Text>
                {gov.partnerEmail ? (
                  <Text style={styles.partnerWarningText}>
                    ⚠️ {t('privacy.deletePartnerWarning', { email: gov.partnerEmail })}
                  </Text>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Type exact household name (
                    <Text style={styles.boldMono}>{gov.householdName}</Text>) to confirm:
                  </Text>
                  <TextInput
                    style={styles.modalInputDanger}
                    value={typedConfirm}
                    onChangeText={setTypedConfirm}
                    placeholder={gov.householdName}
                    placeholderTextColor="#FDA4AF"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmDeleteBtn,
                      (!isDeleteValid || isSubmitting) && styles.btnDisabled,
                    ]}
                    onPress={handleDeleteHousehold}
                    disabled={!isDeleteValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmDeleteBtnText}>Erase Permanently</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  leaveBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  leaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  deleteBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalTitleDanger: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  partnerWarningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  boldMono: {
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  modalInputDanger: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  confirmLeaveBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  confirmLeaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmDeleteBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  confirmDeleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default HouseholdDangerZoneSection;
