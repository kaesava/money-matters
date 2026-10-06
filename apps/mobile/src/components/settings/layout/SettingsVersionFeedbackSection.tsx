import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { getMobileVersionInfo } from '../../../lib/version';

interface SettingsVersionFeedbackSectionProps {
  onOpenFeedback: () => void;
  onCopyDiagnostics: () => void;
}

export function SettingsVersionFeedbackSection({
  onOpenFeedback,
  onCopyDiagnostics,
}: SettingsVersionFeedbackSectionProps) {
  const versionInfo = getMobileVersionInfo();

  return (
    <View style={styles.container}>
      {/* Feedback Button */}
      <TouchableOpacity
        style={styles.feedbackBtn}
        onPress={onOpenFeedback}
        activeOpacity={0.8}
      >
        <Feather name="message-square" size={16} color={DESIGN_TOKENS.colors.primary} />
        <Text style={styles.feedbackBtnText}>
          {t('settings.reportBugLink')}
        </Text>
      </TouchableOpacity>

      {/* Inconspicuous Version Footer */}
      <TouchableOpacity
        onPress={onCopyDiagnostics}
        activeOpacity={0.7}
        style={styles.versionFooter}
      >
        <Text style={styles.versionText}>
          Money Matters {versionInfo.formattedVersion} • {versionInfo.channel} channel
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  feedbackBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  versionFooter: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[500],
  },
});
