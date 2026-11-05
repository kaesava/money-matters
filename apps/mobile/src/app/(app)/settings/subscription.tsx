import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { MobileScreenWrapper, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SubscriptionPlanSection } from '../../../components/settings/SubscriptionPlanSection';

export default function MobileSubscriptionSettingsScreen() {
  return (
    <MobileScreenWrapper title={t('subscription.sectionTitle')}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <SubscriptionPlanSection />
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: DESIGN_TOKENS.spacing.containerMargin,
    gap: DESIGN_TOKENS.spacing.cardPadding,
  },
});
