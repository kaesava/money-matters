import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileCheckbox, MobileAlertBanner } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface EnvelopeEventsToggleSectionProps {
  generateEvents: boolean;
  setGenerateEvents: (val: boolean) => void;
  initialGenerateEvents?: boolean;
  hasExistingScheduledEvents?: boolean;
  isEdit?: boolean;
  isPastStartDate?: boolean;
}

export const EnvelopeEventsToggleSection: React.FC<EnvelopeEventsToggleSectionProps> = ({
  generateEvents,
  setGenerateEvents,
  initialGenerateEvents = true,
  hasExistingScheduledEvents = false,
  isEdit = false,
  isPastStartDate = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isModified = generateEvents !== initialGenerateEvents;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Feather
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={14}
          color={DESIGN_TOKENS.colors.textMuted}
        />
        <Text style={styles.accordionTitle}>{t('common.advancedOptions')}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.accordionBody}>
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
          {generateEvents && isPastStartDate && (isEdit || isModified) && (
            <View style={styles.bannerWrapper}>
              <MobileAlertBanner variant="warning">
                {t('categories.generateEventsPastStartDateWarning')}
              </MobileAlertBanner>
            </View>
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
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  accordionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  accordionBody: {
    paddingTop: 6,
    paddingLeft: 12,
    gap: 4,
  },
  bannerWrapper: {
    marginTop: 6,
  },
});
