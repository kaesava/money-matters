import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

interface SettingsHeaderActionsProps {
  loading: boolean;
  onOpenFeedback: () => void;
  onSignOut: () => void;
}

export function SettingsHeaderActions({
  loading,
  onOpenFeedback,
  onSignOut,
}: SettingsHeaderActionsProps) {
  return (
    <View style={styles.container}>
      {/* Provide Feedback Button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenFeedback}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('settings.reportBugLink')}
      >
        <Feather name="message-square" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
      </TouchableOpacity>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={[styles.actionBtn, styles.signOutBtn, loading && styles.btnDisabled]}
        onPress={onSignOut}
        disabled={loading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('settings.signOut')}
      >
        {loading ? (
          <ActivityIndicator size="small" color={DESIGN_TOKENS.colors.critical} />
        ) : (
          <Feather name="log-out" size={16} color={DESIGN_TOKENS.colors.critical} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtn: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
