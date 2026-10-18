import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface MobilePaydayActionButtonsProps {
  isConfirmed: boolean;
  isLocked: boolean;
  isDirty: boolean;
  isDeficit: boolean;
  isFutureDate?: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onUnlockAndRecalculate?: () => void;
  onRecalculate?: () => void;
  onLockSplit?: () => void;
  onSaveChanges?: () => void;
  onDiscardEdits?: () => void;
}

export function MobilePaydayActionButtons({
  isConfirmed,
  isLocked,
  isDirty,
  isDeficit,
  isFutureDate = false,
  submitting,
  onConfirm,
  onUnlockAndRecalculate,
  onRecalculate,
  onLockSplit,
  onSaveChanges,
  onDiscardEdits,
}: MobilePaydayActionButtonsProps) {
  if (isConfirmed) return null;

  return (
    <View style={styles.actionContainer}>
      {isDirty ? (
        <>
          <View style={styles.dualRow}>
            {isLocked ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onSaveChanges}
                  disabled={isDeficit || submitting}
                  style={[styles.primaryActionBtn, (isDeficit || submitting) && styles.disabledBtn]}
                >
                  <Feather name="lock" size={14} color="#FFFFFF" />
                  <Text style={styles.btnText}>{t('paydayDrawer.saveChanges')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onDiscardEdits}
                  disabled={submitting}
                  style={[styles.secondaryActionBtn, submitting && styles.disabledBtn]}
                >
                  <Feather name="rotate-ccw" size={14} color="#FFFFFF" />
                  <Text style={styles.btnText}>{t('paydayDrawer.discardEdits')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onLockSplit}
                  disabled={isDeficit || submitting}
                  style={[styles.primaryActionBtn, (isDeficit || submitting) && styles.disabledBtn]}
                >
                  <Feather name="lock" size={14} color="#FFFFFF" />
                  <Text style={styles.btnText}>{t('paydayDrawer.lockSplit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onRecalculate}
                  disabled={submitting}
                  style={[styles.secondaryActionBtn, submitting && styles.disabledBtn]}
                >
                  <Feather name="rotate-ccw" size={14} color="#FFFFFF" />
                  <Text style={styles.btnText}>{t('paydayDrawer.recalculate')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onConfirm}
            disabled={isDeficit || submitting || isFutureDate}
            style={[styles.confirmBtnFull, (isDeficit || submitting || isFutureDate) && styles.disabledBtn]}
          >
            <Feather name="check-circle" size={15} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>{t('paydayDrawer.confirmIncomeSplit')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.actionButtonsRow}>
          {isLocked ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onUnlockAndRecalculate}
              disabled={submitting}
              style={[styles.secondaryActionBtn, submitting && styles.disabledBtn]}
            >
              <Feather name="rotate-ccw" size={14} color="#FFFFFF" />
              <Text style={styles.btnText}>{t('paydayDrawer.unlockAndRecalculate')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onLockSplit}
              disabled={isDeficit || submitting}
              style={[styles.secondaryActionBtn, (isDeficit || submitting) && styles.disabledBtn]}
            >
              <Feather name="lock" size={14} color="#FFFFFF" />
              <Text style={styles.btnText}>{t('paydayDrawer.lockSplit')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onConfirm}
            disabled={isDeficit || submitting || isFutureDate}
            style={[styles.confirmBtn, (isDeficit || submitting || isFutureDate) && styles.disabledBtn]}
          >
            <Feather name="check-circle" size={15} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>{t('paydayDrawer.confirmIncomeSplit')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    gap: 8,
  },
  dualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.success,
    paddingVertical: 12,
    borderRadius: 14,
  },
  confirmBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.success,
    paddingVertical: 12,
    borderRadius: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
