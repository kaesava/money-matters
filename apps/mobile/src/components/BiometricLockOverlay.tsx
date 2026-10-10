import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  authenticateWithBiometrics,
  markSessionUnlocked,
} from '../lib/biometrics';

interface BiometricLockOverlayProps {
  onUnlocked: () => void;
}

export const BiometricLockOverlay: React.FC<BiometricLockOverlayProps> = ({ onUnlocked }) => {
  const [authenticating, setAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    triggerAuth();
  }, []);

  const triggerAuth = async () => {
    setAuthenticating(true);
    setErrorMsg(null);
    try {
      const success = await authenticateWithBiometrics(
        t('modals.biometric.prompt')
      );
      if (success) {
        markSessionUnlocked();
        onUnlocked();
      } else {
        setErrorMsg(
          t('modals.biometric.failed')
        );
      }
    } catch {
      setErrorMsg(t('modals.biometric.error'));
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={40} color={DESIGN_TOKENS.colors.accent} />
        </View>

        <Text style={styles.title}>
          {t('modals.biometric.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('modals.biometric.subtitle')}
        </Text>

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={triggerAuth}
          disabled={authenticating}
          activeOpacity={0.8}
        >
          {authenticating ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} />
          ) : (
            <View style={styles.btnRow}>
              <Feather name="shield" size={18} color={DESIGN_TOKENS.colors.onAccent} />
              <Text style={styles.unlockBtnText}>
                {t('modals.biometric.unlockButton')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DESIGN_TOKENS.colors.primary,
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.critical,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  unlockBtn: {
    width: '100%',
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlockBtnText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default BiometricLockOverlay;
