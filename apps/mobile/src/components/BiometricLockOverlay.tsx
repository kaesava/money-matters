import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  authenticateWithBiometrics,
  getBiometricTypeLabel,
  markSessionUnlocked,
} from '../lib/biometrics';

interface BiometricLockOverlayProps {
  onUnlocked: () => void;
}

export const BiometricLockOverlay: React.FC<BiometricLockOverlayProps> = ({ onUnlocked }) => {
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getBiometricTypeLabel().then(setBiometricLabel).catch(() => {});
    triggerAuth();
  }, []);

  const triggerAuth = async () => {
    setAuthenticating(true);
    setErrorMsg(null);
    try {
      const success = await authenticateWithBiometrics(
        t('modals.biometric.prompt', { defaultValue: 'Unlock Money Matters' })
      );
      if (success) {
        markSessionUnlocked();
        onUnlocked();
      } else {
        setErrorMsg(
          t('modals.biometric.failed', {
            defaultValue: 'Authentication required to access your financial data.',
          })
        );
      }
    } catch {
      setErrorMsg(t('modals.biometric.error', { defaultValue: 'Unable to authenticate.' }));
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={40} color="#2563eb" />
        </View>

        <Text style={styles.title}>
          {t('modals.biometric.title', { defaultValue: 'Money Matters Locked' })}
        </Text>
        <Text style={styles.subtitle}>
          {t('modals.biometric.subtitle', {
            defaultValue: 'Your financial information is protected. Authenticate to continue.',
          })}
        </Text>

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={triggerAuth}
          disabled={authenticating}
          activeOpacity={0.8}
        >
          {authenticating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.btnRow}>
              <Feather name="shield" size={18} color="#ffffff" />
              <Text style={styles.unlockBtnText}>
                {t('modals.biometric.unlockButton', {
                  defaultValue: `Unlock with ${biometricLabel}`,
                })}
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
    backgroundColor: '#1B2B4B',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#ba1a1a',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  unlockBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
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
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default BiometricLockOverlay;
