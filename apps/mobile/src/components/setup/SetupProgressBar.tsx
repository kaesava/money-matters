import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';

interface SetupProgressBarProps {
  currentStep: number;
  totalSteps: number;
  isRerun: boolean;
}

export function SetupProgressBar({ currentStep, totalSteps, isRerun }: SetupProgressBarProps) {
  const router = useRouter();
  const updatePref = trpc.updateUserPreferences.useMutation();

  const handleAction = () => {
    if (isRerun) {
      showMobileConfirm({
        title: t('setup.cancelSetupConfirmTitle'),
        message: t('setup.cancelSetupConfirmMessage'),
        confirmText: t('common.cancel'),
        onConfirm: () => {
          router.replace('/(app)/home');
        },
      });
    } else {
      showMobileConfirm({
        title: t('setup.skipConfirmTitle'),
        message: t('setup.skipConfirmMessage'),
        confirmText: t('setup.skipConfirmButton'),
        onConfirm: async () => {
          try {
            await updatePref.mutateAsync({ setupCompleted: true });
          } catch {
            // Non-blocking preference update
          }
          router.replace('/(app)/home');
        },
      });
    }
  };

  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.topNavRow}>
      <View style={styles.progressRow}>
        {dots.map((stepNum) => (
          <View
            key={stepNum}
            style={[
              styles.progressDot,
              stepNum <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
      <TouchableOpacity
        onPress={handleAction}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.actionBtnText}>
          {isRerun ? t('common.cancel') : t('setup.skipForNow')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
  progressDotActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
  },
});
