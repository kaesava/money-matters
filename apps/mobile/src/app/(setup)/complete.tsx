import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';

export default function SetupCompleteScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎉</Text>
      <Text style={styles.title}>{t('setup.complete.title')}</Text>
      <Text style={styles.subtitle}>{t('setup.complete.subtitle')}</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.replace('/(app)/home')}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>{t('setup.complete.goDashboard')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: D.spacing.containerMargin,
    backgroundColor: D.colors.background,
  },
  icon: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: D.colors.primary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: D.colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 300, marginBottom: 40 },
  btn: { backgroundColor: D.colors.accent, paddingVertical: 15, paddingHorizontal: 40, borderRadius: D.radius.md },
  btnText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
