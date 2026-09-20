import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { authClient } from '../../../lib/auth';
import { MobileArchivedSection } from '../../../components/settings/MobileArchivedSection';

export default function MobileArchivedItemsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  return (
    <MobileScreenWrapper
      title={t('settings.tabs.archived')}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
      infoTooltip={{
        title: t('tooltips.archived.title'),
        content: t('tooltips.archived.content'),
      }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <MobileArchivedSection />
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
});
