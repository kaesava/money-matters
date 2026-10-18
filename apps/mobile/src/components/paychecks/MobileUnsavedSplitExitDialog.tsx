import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface MobileUnsavedSplitExitDialogProps {
  visible: boolean;
  isDeficit: boolean;
  deficitAmount?: string;
  submitting?: boolean;
  onClose: () => void;
  onDiscardAndExit: () => void;
  onSaveAndExit?: () => void;
}

export function MobileUnsavedSplitExitDialog({
  visible,
  isDeficit,
  deficitAmount = '$0.00',
  submitting = false,
  onClose,
  onDiscardAndExit,
  onSaveAndExit,
}: MobileUnsavedSplitExitDialogProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, isDeficit ? styles.iconWrapDeficit : styles.iconWrapWarning]}>
            <Feather
              name={isDeficit ? 'alert-circle' : 'alert-triangle'}
              size={24}
              color={isDeficit ? DESIGN_TOKENS.colors.burnRed : '#D97706'}
            />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>
              {isDeficit ? t('paydayDrawer.deficitExitTitle') : t('paydayDrawer.unsavedChangesTitle')}
            </Text>
            <Text style={styles.desc}>
              {isDeficit
                ? t('paydayDrawer.deficitExitDesc', { amount: deficitAmount })
                : t('paydayDrawer.unsavedChangesDesc')}
            </Text>
          </View>

          <View style={styles.buttonStack}>
            {isDeficit ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{t('paydayDrawer.keepEditing')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onDiscardAndExit}
                  style={styles.dangerBtn}
                >
                  <Text style={styles.dangerBtnText}>{t('paydayDrawer.discardAndExit')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onSaveAndExit}
                  disabled={submitting}
                  style={[styles.primaryBtn, submitting && styles.disabledBtn]}
                >
                  <Text style={styles.primaryBtnText}>{t('paydayDrawer.saveAndExit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onDiscardAndExit}
                  disabled={submitting}
                  style={[styles.dangerBtn, submitting && styles.disabledBtn]}
                >
                  <Text style={styles.dangerBtnText}>{t('paydayDrawer.discardAndExit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  disabled={submitting}
                  style={styles.ghostBtn}
                >
                  <Text style={styles.ghostBtnText}>{t('paydayDrawer.keepEditing')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapWarning: {
    backgroundColor: '#FEF3C7',
  },
  iconWrapDeficit: {
    backgroundColor: '#FFE4E6',
  },
  textWrap: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonStack: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerBtn: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: DESIGN_TOKENS.colors.burnRed,
    fontSize: 14,
    fontWeight: '700',
  },
  ghostBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
