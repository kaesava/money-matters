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
      title={t('settings.tabs.archived', { defaultValue: 'Archived Data' })}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
      infoTooltip={{
        title: t('tooltips.archived.title', { defaultValue: 'About Archived Items' }),
        content: t('tooltips.archived.content', {
          defaultValue: 'View and restore archived spending pools, recurring bill schedules, or bank accounts.',
        }),
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
