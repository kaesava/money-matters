import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

interface FeedbackDiagnosticsBoxProps {
  formattedVersion: string;
  channel: string;
  gitCommit: string;
}

export function FeedbackDiagnosticsBox({
  formattedVersion,
  channel,
  gitCommit,
}: FeedbackDiagnosticsBoxProps) {
  return (
    <View style={styles.telemetryBox}>
      <Text style={styles.telemetryTitle}>📱 Captured Diagnostics</Text>
      <Text style={styles.telemetryItem}>App: Money Matters {formattedVersion}</Text>
      <Text style={styles.telemetryItem}>Platform: Android ({channel} channel)</Text>
      <Text style={styles.telemetryItem}>Commit: {gitCommit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  telemetryBox: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  telemetryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  telemetryItem: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    fontFamily: 'monospace',
  },
});
