import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MobileCheckbox, MobileAlertBanner } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface EnvelopeEventsToggleSectionProps {
  generateEvents: boolean;
  setGenerateEvents: (val: boolean) => void;
  initialGenerateEvents?: boolean;
  hasExistingScheduledEvents?: boolean;
  isEdit?: boolean;
}

export const EnvelopeEventsToggleSection: React.FC<EnvelopeEventsToggleSectionProps> = ({
  generateEvents,
  setGenerateEvents,
  initialGenerateEvents = true,
  hasExistingScheduledEvents = false,
  isEdit = false,
}) => {
  const isModified = generateEvents !== initialGenerateEvents;

  return (
    <View style={styles.container}>
      <MobileCheckbox
        label={t('categories.generateEventsLabel')}
        checked={generateEvents}
        onChange={setGenerateEvents}
      />
      {isModified && (
        <View style={styles.bannerWrapper}>
          {generateEvents ? (
            <MobileAlertBanner variant="info">
              {t('categories.generateEventsCheckedImplication')}
            </MobileAlertBanner>
          ) : (
            <MobileAlertBanner variant="warning">
              {isEdit || hasExistingScheduledEvents
                ? t('categories.generateEventsUncheckedEditImplication')
                : t('categories.generateEventsUncheckedNewImplication')}
            </MobileAlertBanner>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    gap: 4,
  },
  bannerWrapper: {
    marginTop: 6,
  },
});
