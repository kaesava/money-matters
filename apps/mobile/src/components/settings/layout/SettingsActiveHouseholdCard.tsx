import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

interface TenantSummary {
  id: string;
  name: string;
  role?: string;
  isCurrent?: boolean;
}

interface SettingsActiveHouseholdCardProps {
  currentTenant?: TenantSummary;
  showSwitcher: boolean;
  onOpenSwitcher: () => void;
}

export function SettingsActiveHouseholdCard({
  currentTenant,
  showSwitcher,
  onOpenSwitcher,
}: SettingsActiveHouseholdCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('tenantSwitcher.label')}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {currentTenant?.name || 'My Household'}
          </Text>
          <Text style={styles.role}>Role: {currentTenant?.role || 'OWNER'}</Text>
        </View>
      </View>

      {showSwitcher && (
        <TouchableOpacity
          onPress={onOpenSwitcher}
          style={styles.switchButton}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={14} color={DESIGN_TOKENS.colors.primary} />
          <Text style={styles.switchButtonText}>
            {t('tenantSwitcher.switchAction')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[800],
    marginTop: 1,
  },
  role: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.accent,
    marginTop: 2,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
});
