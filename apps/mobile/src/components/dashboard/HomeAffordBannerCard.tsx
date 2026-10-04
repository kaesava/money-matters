import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export function HomeAffordBannerCard() {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/(app)/afford-check' as never)}
      style={styles.affordActionCard}
    >
      <View style={styles.affordIconWrap}>
        <Feather name="help-circle" size={20} color={DESIGN_TOKENS.colors.sereneBlue} />
      </View>
      <View style={styles.affordContent}>
        <Text style={styles.affordTitle}>{t('canIAfford.title')}</Text>
        <Text style={styles.affordSubtitle}>
          {t('dashboard.affordSubtitle')}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={DESIGN_TOKENS.colors.sereneBlue} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  affordActionCard: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  affordIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordContent: {
    flex: 1,
  },
  affordTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  affordSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.sereneBlue,
    marginTop: 1,
  },
});
