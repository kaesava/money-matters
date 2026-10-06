import { useState, useEffect } from 'react';
import {
  checkBiometricsAvailable,
  getBiometricTypeLabel,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateWithBiometrics,
} from '../../../lib/biometrics';

export function useProfileBiometrics() {
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  const refreshBiometrics = () => {
    checkBiometricsAvailable().then(setBiometricsAvailable).catch(() => {});
    getBiometricTypeLabel().then(setBiometricLabel).catch(() => {});
    isBiometricLockEnabled().then(setBiometricsEnabled).catch(() => {});
  };

  useEffect(() => {
    refreshBiometrics();
  }, []);

  const handleToggleBiometrics = async () => {
    const nextState = !biometricsEnabled;
    if (nextState) {
      const authenticated = await authenticateWithBiometrics(
        'Enable biometric security for Money Matters'
      );
      if (authenticated) {
        await setBiometricLockEnabled(true);
        setBiometricsEnabled(true);
      }
    } else {
      await setBiometricLockEnabled(false);
      setBiometricsEnabled(false);
    }
  };

  return {
    biometricsAvailable,
    biometricsEnabled,
    biometricLabel,
    handleToggleBiometrics,
    refreshBiometrics,
  };
}
