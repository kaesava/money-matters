import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MobileModalDialog, MobileButton, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export type PlanChoice = 'annual' | 'monthly';

interface MobilePlanPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (plan: PlanChoice) => Promise<void>;
  loading: boolean;
}

export function MobilePlanPickerModal({
  visible,
  onClose,
  onSelectPlan,
  loading,
}: MobilePlanPickerModalProps) {
  const [billingCycle, setBillingCycle] = useState<PlanChoice>('annual');

  const handleConfirm = async () => {
    await onSelectPlan(billingCycle);
  };

  const featureKeys = [
    'subscription.featureBudgeting',
    'subscription.featureHistoryPaid',
    'subscription.featureGoalsPaid',
    'subscription.featureCsvImportPaid',
    'subscription.featureFileNotesPaid',
    'subscription.featureNotifications',
    'subscription.featurePartner',
  ] as const;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('subscription.upgradePageTitle')}
      subtitle={t('subscription.upgradePageSubtitle')}
      footer={
        <View style={styles.footerRow}>
          <MobileButton
            variant="ghost"
            label={t('common.cancel')}
            onPress={onClose}
            disabled={loading}
          />
          <MobileButton
            variant="primary"
            label={
              billingCycle === 'annual'
                ? t('subscription.claimFoundingRate')
                : t('subscription.subscribeMonthlyCta')
            }
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
          />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Billing Cycle 2-Option Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === 'annual' && styles.toggleBtnActive]}
            onPress={() => setBillingCycle('annual')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, billingCycle === 'annual' && styles.toggleTextActive]}>
              {t('subscription.annualTabFounding')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setBillingCycle('monthly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
              {t('subscription.monthlyTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected Plan Pricing Card */}
        <View style={styles.priceCard}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planHeading}>{t('subscription.householdPlanName')}</Text>
            {billingCycle === 'annual' && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>22% OFF</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            {billingCycle === 'annual' ? (
              <>
                <Text style={styles.strikePrice}>$89</Text>
                <Text style={styles.mainPrice}>$69</Text>
                <Text style={styles.pricePeriod}>AUD / yr ($5.75/mo)</Text>
              </>
            ) : (
              <>
                <Text style={styles.mainPrice}>$9.95</Text>
                <Text style={styles.pricePeriod}>AUD / month</Text>
              </>
            )}
          </View>

          {billingCycle === 'annual' && (
            <View style={styles.foundingOfferBanner}>
              <Text style={styles.foundingOfferText}>
                🏷️ {t('subscription.foundingMemberBadge')}
              </Text>
            </View>
          )}
        </View>

        {/* Included Features Checklist */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresHeading}>
            {t('subscription.includedFeaturesTitle')}
          </Text>
          <View style={styles.featuresList}>
            {featureKeys.map((key) => (
              <View key={key} style={styles.featureItem}>
                <View style={styles.checkIcon}>
                  <Feather name="check" size={12} color={DESIGN_TOKENS.colors.accent} />
                </View>
                <Text style={styles.featureText}>{t(key)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Guarantees Row */}
        <View style={styles.guaranteeRow}>
          <Text style={styles.guaranteeText}>
            🔒 {t('subscription.guaranteeCancel')} • 🇦🇺 {t('subscription.guaranteePrivacy')} • ⚡ {t('subscription.guaranteeInstant')}
          </Text>
        </View>

        {/* Support Help Text */}
        <View style={styles.supportRow}>
          <Text style={styles.supportText}>
            {t('subscription.supportHelpText', { email: 'info@moneymatters.kaesava.au' })}
          </Text>
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: DESIGN_TOKENS.radius.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  toggleTextActive: {
    color: DESIGN_TOKENS.colors.onPrimary,
  },
  priceCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.accent,
    gap: 8,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
    textTransform: 'uppercase',
  },
  discountBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DESIGN_TOKENS.radius.sm,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  strikePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.subtleText,
    textDecorationLine: 'line-through',
  },
  mainPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary,
  },
  pricePeriod: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  foundingOfferBanner: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    padding: 8,
    borderRadius: DESIGN_TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  foundingOfferText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  featuresSection: {
    gap: 8,
    marginTop: 4,
  },
  featuresHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.subtleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
    flex: 1,
  },
  guaranteeRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.border,
    alignItems: 'center',
  },
  guaranteeText: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  supportRow: {
    alignItems: 'center',
  },
  supportText: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.subtleText,
    textAlign: 'center',
  },
});
