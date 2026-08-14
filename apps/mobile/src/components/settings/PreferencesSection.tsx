import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { t, setLanguage, getLanguage, SupportedLanguage } from '@money-matters/i18n';
import { useIconVisibility } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';

export function PreferencesSection() {
  const { showIcons, setShowIcons } = useIconVisibility();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const currentLang = getLanguage();

  const handleToggleLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  const handleToggleShowIcons = (value: boolean) => {
    setShowIcons(value);
    updateUserPrefMut.mutate({ appPreferences: { ui: { showIcons: value } } });
  };


  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>⚙️ {t('settings.title')}</Text>

      {/* Language switcher */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('settings.language', { defaultValue: 'Language' })}</Text>
        <View style={styles.langToggleGroup}>
          <TouchableOpacity
            style={[styles.langBtn, currentLang === 'en' && styles.langBtnActive]}
            onPress={() => handleToggleLanguage('en')}
          >
            <Text style={[styles.langBtnText, currentLang === 'en' && styles.langBtnTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, currentLang === 'ja' && styles.langBtnActive]}
            onPress={() => handleToggleLanguage('ja')}
          >
            <Text style={[styles.langBtnText, currentLang === 'ja' && styles.langBtnTextActive]}>JA</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Show icons switcher */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Show UI Icons</Text>
        <Switch
          value={showIcons}
          onValueChange={handleToggleShowIcons}
          trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
          thumbColor={showIcons ? '#2563eb' : '#F8FAFC'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  langToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#2563eb',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
});
