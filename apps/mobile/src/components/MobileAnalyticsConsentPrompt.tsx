import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { usePostHog } from 'posthog-react-native';
import { MobileModalDialog, MobileButton, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export const ANALYTICS_CONSENT_KEY = 'mm_analytics_consent';

export function MobileAnalyticsConsentPrompt() {
  const posthog = usePostHog();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    SecureStore.getItemAsync(ANALYTICS_CONSENT_KEY)
      .then((val) => {
        if (!isMounted) return;
        if (val === null) {
          setVisible(true);
        } else if (val === 'denied') {
          posthog?.optOut();
        } else if (val === 'granted') {
          posthog?.optIn();
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [posthog]);

  const handleConsent = async (granted: boolean) => {
    try {
      await SecureStore.setItemAsync(ANALYTICS_CONSENT_KEY, granted ? 'granted' : 'denied');
      if (granted) {
        posthog?.optIn();
      } else {
        posthog?.optOut();
      }
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={() => handleConsent(false)}
      title={t('privacy.analyticsConsentTitle')}
      footer={
        <View style={styles.footerRow}>
          <MobileButton
            variant="ghost"
            label={t('privacy.analyticsConsentDecline')}
            onPress={() => handleConsent(false)}
          />
          <MobileButton
            variant="primary"
            label={t('privacy.analyticsConsentAccept')}
            onPress={() => handleConsent(true)}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.description}>
          {t('privacy.analyticsConsentDesc')}
        </Text>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
  },
  description: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
