import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, InfoTooltip } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface MobileSetupStepHeaderCardProps {
  step: number;
  totalSteps: number;
  title: string;
  tooltipTitle?: string;
  tooltipContent?: string;
  badgeLabel?: string;
  pillContent?: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
  isNextLoading?: boolean;
}

export function MobileSetupStepHeaderCard({
  step,
  totalSteps,
  title,
  tooltipTitle,
  tooltipContent,
  badgeLabel,
  pillContent,
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel,
  backLabel,
  isNextLoading = false,
}: MobileSetupStepHeaderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.stepBadgeGroup}>
          <Text style={styles.stepLabel}>
            {t('setup.stepOf', { step, total: totalSteps })}
          </Text>
          {badgeLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.navGroup}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backBtnText}>{backLabel || t('common.back')}</Text>
            </TouchableOpacity>
          )}
          {onNext && (
            <TouchableOpacity
              onPress={onNext}
              disabled={nextDisabled || isNextLoading}
              style={[styles.nextBtn, (nextDisabled || isNextLoading) && styles.nextBtnDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.nextBtnText}>{nextLabel || `${t('common.next')} →`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {tooltipContent && (
          <InfoTooltip title={tooltipTitle} content={tooltipContent} />
        )}
      </View>

      {pillContent && (
        <View style={styles.pillContainer}>
          {pillContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginBottom: 16,
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DESIGN_TOKENS.radius.full,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
    textTransform: 'uppercase',
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DESIGN_TOKENS.radius.sm,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  nextBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: DESIGN_TOKENS.radius.sm,
    backgroundColor: DESIGN_TOKENS.colors.accent,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary,
  },
  pillContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
});
