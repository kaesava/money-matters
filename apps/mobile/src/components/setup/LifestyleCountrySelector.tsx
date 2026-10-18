import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

interface LifestyleCountrySelectorProps {
  country: 'AU' | 'NZ' | 'OTHER';
  setCountry: (c: 'AU' | 'NZ' | 'OTHER') => void;
}

export function LifestyleCountrySelector({ country, setCountry }: LifestyleCountrySelectorProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{t('setup.lifestyle.countryLabel')}</Text>
      <View style={styles.chipGrid}>
        {(['AU', 'NZ', 'OTHER'] as const).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, country === c && styles.chipActive]}
            onPress={() => setCountry(c)}
          >
            <Text style={[styles.chipText, country === c && styles.chipTextActive]}>
              {c === 'AU'
                ? t('setup.lifestyle.countryAu')
                : c === 'NZ'
                ? t('setup.lifestyle.countryNz')
                : t('setup.lifestyle.countryOther')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: DESIGN_TOKENS.radius.full, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], backgroundColor: DESIGN_TOKENS.colors.surfaceVariant },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  chipText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
  chipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
});
