import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { t } from '@money-matters/i18n';

export interface MobileMatrixFilterBarProps {
  statusFilter: 'ALL' | 'PENDING' | 'CONFIRMED';
  onStatusChange: (status: 'ALL' | 'PENDING' | 'CONFIRMED') => void;
  scopeFilter: 'ALL' | 'SHARED' | 'PRIVATE';
  onScopeChange: (scope: 'ALL' | 'SHARED' | 'PRIVATE') => void;
  showFullHorizon: boolean;
  onHorizonChange: (full: boolean) => void;
}

export function MobileMatrixFilterBar({
  statusFilter,
  onStatusChange,
  scopeFilter,
  onScopeChange,
  showFullHorizon,
  onHorizonChange,
}: MobileMatrixFilterBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Filter Group */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[styles.pill, statusFilter === 'PENDING' && styles.pillActive]}
            onPress={() => onStatusChange('PENDING')}
          >
            <Text style={[styles.pillText, statusFilter === 'PENDING' && styles.pillTextActive]}>
              {t('matrix.statusPending')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, statusFilter === 'CONFIRMED' && styles.pillActive]}
            onPress={() => onStatusChange('CONFIRMED')}
          >
            <Text style={[styles.pillText, statusFilter === 'CONFIRMED' && styles.pillTextActive]}>
              {t('matrix.statusConfirmed')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, statusFilter === 'ALL' && styles.pillActive]}
            onPress={() => onStatusChange('ALL')}
          >
            <Text style={[styles.pillText, statusFilter === 'ALL' && styles.pillTextActive]}>
              {t('matrix.statusAll')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Scope Filter Group */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[styles.pill, scopeFilter === 'ALL' && styles.pillActive]}
            onPress={() => onScopeChange('ALL')}
          >
            <Text style={[styles.pillText, scopeFilter === 'ALL' && styles.pillTextActive]}>
              {t('common.all')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, scopeFilter === 'SHARED' && styles.pillActive]}
            onPress={() => onScopeChange('SHARED')}
          >
            <Text style={[styles.pillText, scopeFilter === 'SHARED' && styles.pillTextActive]}>
              {t('common.shared')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, scopeFilter === 'PRIVATE' && styles.pillActive]}
            onPress={() => onScopeChange('PRIVATE')}
          >
            <Text style={[styles.pillText, scopeFilter === 'PRIVATE' && styles.pillTextActive]}>
              {t('common.private')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Horizon Toggle */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[styles.pill, !showFullHorizon && styles.pillActive]}
            onPress={() => onHorizonChange(false)}
          >
            <Text style={[styles.pillText, !showFullHorizon && styles.pillTextActive]}>
              {t('matrix.showNext5')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, showFullHorizon && styles.pillActive]}
            onPress={() => onHorizonChange(true)}
          >
            <Text style={[styles.pillText, showFullHorizon && styles.pillTextActive]}>
              {t('matrix.showFull12Events')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillActive: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  pillTextActive: {
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
});
