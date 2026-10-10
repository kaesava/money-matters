import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatDate } from '../../lib/format';

interface PaycheckStudioSubheaderProps {
  isConfirmedPlan: boolean;
  isSavedPlan: boolean;
  selectedDate: string;
  isReadOnly: boolean;
  isDirty: boolean;
  submitting: boolean;
  onRecalculate: () => void;
  onResetPlan?: () => void;
  onResetEdits: () => void;
  onDeleteIncome: () => void;
}

export function PaycheckStudioSubheader({
  isConfirmedPlan,
  isSavedPlan,
  selectedDate,
  isReadOnly,
  isDirty,
  submitting,
  onRecalculate,
  onResetPlan,
  onResetEdits,
  onDeleteIncome,
}: PaycheckStudioSubheaderProps) {
  return (
    <View style={styles.subheader}>
      <View style={styles.badgeRow}>
        {isConfirmedPlan ? (
          <View style={[styles.badge, styles.confirmedBadge]}>
            <Text style={[styles.badgeText, styles.confirmedBadgeText]}>
              ✓ {t('paydayDrawer.confirmedBadge')}
            </Text>
          </View>
        ) : isSavedPlan ? (
          <View style={[styles.badge, styles.savedBadge]}>
            <Text style={[styles.badgeText, styles.savedBadgeText]}>
              💾 {t('paydayDrawer.savedBadge')}
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.autoBadge]}>
            <Text style={[styles.badgeText, styles.autoBadgeText]}>
              ✨ {t('paydayDrawer.autoBadge')}
            </Text>
          </View>
        )}

        <Text style={styles.subheaderDateText}>
          {formatDate(selectedDate)} • {t('paydayDrawer.subtitle')}
        </Text>
      </View>

      <View style={styles.headerActionsRow}>
        {!isReadOnly && isSavedPlan && onResetPlan && (
          <TouchableOpacity
            onPress={onResetPlan}
            disabled={submitting}
            style={styles.resetPlanBtn}
            accessibilityLabel={t('common.reset')}
          >
            <Feather name="rotate-ccw" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
            <Text style={styles.resetPlanText}>{t('common.reset')}</Text>
          </TouchableOpacity>
        )}

        {!isReadOnly && !isSavedPlan && (
          <TouchableOpacity
            onPress={onRecalculate}
            disabled={submitting}
            style={styles.iconActionBtn}
            accessibilityLabel={t('paydayDrawer.recalculate')}
          >
            <Feather name="refresh-cw" size={15} color={DESIGN_TOKENS.colors.sereneBlue} />
          </TouchableOpacity>
        )}

        {isDirty && !isReadOnly && (
          <TouchableOpacity
            onPress={onResetEdits}
            disabled={submitting}
            style={styles.resetEditsBtn}
          >
            <Text style={styles.resetEditsText}>{t('paydayDrawer.resetEdits')}</Text>
          </TouchableOpacity>
        )}

        {!isReadOnly && (
          <TouchableOpacity
            onPress={onDeleteIncome}
            disabled={submitting}
            style={styles.iconActionBtn}
            accessibilityLabel={t('common.delete')}
          >
            <Feather name="trash-2" size={15} color={DESIGN_TOKENS.colors.slate[400]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subheader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flex: 1,
    gap: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  confirmedBadgeText: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  savedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  savedBadgeText: {
    color: DESIGN_TOKENS.colors.accentDark,
  },
  autoBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  autoBadgeText: {
    color: DESIGN_TOKENS.colors.primaryHover,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  subheaderDateText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  resetPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  resetPlanText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  resetEditsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  resetEditsText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
});
