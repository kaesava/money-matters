import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

interface SettingsSignOutButtonProps {
  loading: boolean;
  onSignOut: () => void;
}

export function SettingsSignOutButton({
  loading,
  onSignOut,
}: SettingsSignOutButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.signOutBtn, loading && { opacity: 0.7 }]}
      onPress={onSignOut}
      disabled={loading}
      activeOpacity={0.8}
    >
      <Feather name="log-out" size={16} color={DESIGN_TOKENS.colors.critical} />
      <Text style={styles.signOutBtnText}>
        {loading ? t('common.loading') : t('settings.signOut')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  signOutBtn: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.critical,
  },
});
