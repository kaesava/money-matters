import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface MobileMatrixFilterBarProps {
  readonly statusFilter: 'ALL' | 'PENDING' | 'CONFIRMED';
  readonly onStatusFilterChange: (status: 'ALL' | 'PENDING' | 'CONFIRMED') => void;
  readonly scopeFilter: 'ALL' | 'SHARED' | 'PRIVATE';
  readonly onScopeFilterChange: (scope: 'ALL' | 'SHARED' | 'PRIVATE') => void;
  readonly showFull12: boolean;
  readonly onToggleHorizon: () => void;
}

export const MobileMatrixFilterBar: React.FC<MobileMatrixFilterBarProps> = ({
  statusFilter,
  onStatusFilterChange,
  scopeFilter,
  onScopeFilterChange,
  showFull12,
  onToggleHorizon,
}) => {
  return (
    <View style={styles.container}>
      {/* Horizon Toggle */}
      <TouchableOpacity
        style={styles.horizonToggle}
        onPress={onToggleHorizon}
        activeOpacity={0.7}
      >
        <Feather name={showFull12 ? 'minimize-2' : 'maximize-2'} size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
        <Text style={styles.horizonToggleText}>
          {showFull12 ? t('matrix.showNext5') : t('matrix.showFull12Events')}
        </Text>
      </TouchableOpacity>

      {/* Filter Pills: Status & Scope */}
      <View style={styles.pillsRow}>
        {/* Status Pills */}
        <View style={styles.pillGroup}>
          {(['ALL', 'PENDING', 'CONFIRMED'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => onStatusFilterChange(s)}
            >
              <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                {t(`matrix.status${s}` as 'matrix.statusAll' | 'matrix.statusPending' | 'matrix.statusConfirmed')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scope Pills */}
        <View style={styles.pillGroup}>
          {(['ALL', 'SHARED', 'PRIVATE'] as const).map((sc) => (
            <TouchableOpacity
              key={sc}
              style={[styles.pill, scopeFilter === sc && styles.pillActive]}
              onPress={() => onScopeFilterChange(sc)}
            >
              <Text style={[styles.pillText, scopeFilter === sc && styles.pillTextActive]}>
                {sc === 'ALL' ? t('common.all') : sc === 'SHARED' ? t('common.shared') : t('common.private')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  horizonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  horizonToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  pillActive: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  pillTextActive: {
    color: DESIGN_TOKENS.colors.surface,
  },
});
