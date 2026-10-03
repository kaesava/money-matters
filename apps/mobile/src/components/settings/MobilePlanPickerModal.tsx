import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MobileModalDialog, MobileButton, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export type PlanChoice = 'founding' | 'annual' | 'monthly';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice>('founding');

  const handleConfirm = async () => {
    await onSelectPlan(selectedPlan);
  };

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
              selectedPlan === 'founding'
                ? t('subscription.claimFoundingRate')
                : selectedPlan === 'annual'
                ? t('subscription.subscribeAnnualCta')
                : t('subscription.subscribeMonthlyCta')
            }
            onPress={handleConfirm}
            loading={loading}
            disabled={loading}
          />
        </View>
      }
    >
      <View style={styles.content}>
        {/* Tier 1: Founding Member (Recommended) */}
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'founding' && styles.planCardActive,
          ]}
          onPress={() => setSelectedPlan('founding')}
          activeOpacity={0.8}
        >
          <View style={styles.badgeRow}>
            <View style={styles.recommendBadge}>
              <Text style={styles.recommendBadgeText}>
                ★ {t('subscription.foundingMemberBadge')}
              </Text>
            </View>
            <Text style={styles.discountText}>22% OFF</Text>
          </View>

          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>{t('subscription.planFounding')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.strikePrice}>$89</Text>
              <Text style={styles.priceAmount}>$69</Text>
              <Text style={styles.pricePeriod}>AUD / yr ($5.75/mo)</Text>
            </View>
          </View>
          <Text style={styles.planDesc}>{t('subscription.householdPlanName')}</Text>
        </TouchableOpacity>

        {/* Tier 2: Annual Plan */}
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'annual' && styles.planCardActive,
          ]}
          onPress={() => setSelectedPlan('annual')}
          activeOpacity={0.8}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>{t('subscription.planAnnual')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>$89</Text>
              <Text style={styles.pricePeriod}>AUD / yr ($7.42/mo)</Text>
            </View>
          </View>
          <Text style={styles.planDesc}>{t('subscription.annualTabStandard')}</Text>
        </TouchableOpacity>

        {/* Tier 3: Monthly Plan */}
        <TouchableOpacity
          style={[
            styles.planCard,
            selectedPlan === 'monthly' && styles.planCardActive,
          ]}
          onPress={() => setSelectedPlan('monthly')}
          activeOpacity={0.8}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>{t('subscription.planMonthly')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>$9.95</Text>
              <Text style={styles.pricePeriod}>AUD / month</Text>
            </View>
          </View>
          <Text style={styles.planDesc}>{t('subscription.monthlyTab')}</Text>
        </TouchableOpacity>

        {/* Guarantee footer */}
        <View style={styles.guaranteeRow}>
          <Text style={styles.guaranteeText}>
            🔒 {t('subscription.guaranteeCancel')} • 🇦🇺 {t('subscription.guaranteePrivacy')}
          </Text>
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingVertical: 4,
  },
  planCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  planCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  strikePrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  pricePeriod: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  planDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  guaranteeRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  guaranteeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
