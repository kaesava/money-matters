import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper, useMobileToast } from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { getMobileVersionInfo } from '../../../lib/version';

type WorkflowCategory =
  | 'setup'
  | 'waterfall'
  | 'transactions_sync'
  | 'categories_bills'
  | 'ui_ux'
  | 'account_auth'
  | 'other';

type FrustrationLevel = 1 | 2 | 3 | 4;

export default function MobileBugReportScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { data: session } = authClient.useSession();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkflowCategory>('setup');
  const [frustrationLevel, setFrustrationLevel] = useState<FrustrationLevel>(2);
  const [description, setDescription] = useState('');
  const [contactConsent, setContactConsent] = useState(true);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const versionInfo = getMobileVersionInfo();

  const mutation = trpc.createBugReport.useMutation({
    onSuccess: (data) => {
      const shortRef = data.id.slice(0, 8);
      setSubmittedRef(shortRef);
      toast.success(
        t('bugReport.successMsg', { defaultValue: `Bug report submitted! Ticket #BUG-${shortRef} created.`, ref: shortRef })
      );

      setTimeout(() => {
        router.back();
      }, 3000);
    },
    onError: (err) => {
      toast.error(err.message || t('bugReport.errorMsg'));
    },
  });

  const handleSubmit = () => {
    if (title.trim().length < 3 || description.trim().length < 10) {
      toast.warning(t('bugReport.errorMsg'));
      return;
    }

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      frustrationLevel,
      contactConsent,
      platform: versionInfo.platform,
      appVersion: versionInfo.formattedVersion,
      pageUrl: '/(app)/settings/bug-report',
      deviceInfo: `${Platform.OS} ${Platform.Version}`,
    });
  };

  const D = DESIGN_TOKENS;

  const frustrationOptions: Array<{ level: FrustrationLevel; emoji: string; key: 'level1' | 'level2' | 'level3' | 'level4' }> = [
    { level: 1, emoji: '🟢', key: 'level1' },
    { level: 2, emoji: '🟡', key: 'level2' },
    { level: 3, emoji: '🟠', key: 'level3' },
    { level: 4, emoji: '🔴', key: 'level4' },
  ];

  const categoryOptions: WorkflowCategory[] = [
    'setup',
    'waterfall',
    'transactions_sync',
    'categories_bills',
    'ui_ux',
    'account_auth',
    'other',
  ];

  return (
    <MobileScreenWrapper
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={D.colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('bugReport.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('bugReport.subtitle')}</Text>
          </View>
        </View>

        {submittedRef ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>
              {t('bugReport.successMsg', { defaultValue: `Bug report submitted! Ticket #BUG-${submittedRef} created.`, ref: submittedRef })}
            </Text>
            <Text style={styles.ticketRefText}>
              {t('bugReport.ticketRef', { defaultValue: `Ticket Ref: #BUG-${submittedRef}`, ref: submittedRef })}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.closeBtnText}>{t('bugReport.closeBtn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('bugReport.formTitleLabel')}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('bugReport.formTitlePlaceholder')}
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            {/* Frustration Level */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('bugReport.formSeverityLabel', { defaultValue: 'Frustration Level' })}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {frustrationOptions.map((item) => (
                  <TouchableOpacity
                    key={item.level}
                    style={[
                      styles.chip,
                      frustrationLevel === item.level && styles.chipActive,
                    ]}
                    onPress={() => setFrustrationLevel(item.level)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, frustrationLevel === item.level && styles.chipTextActive]}>
                      {item.emoji} {t(`bugReport.frustrations.${item.key}` as const)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Category Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('bugReport.formCategoryLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categoryOptions.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                      {t(`bugReport.categories.${cat}` as const)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('bugReport.formDescriptionLabel')}</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('bugReport.formDescriptionPlaceholder')}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textArea]}
              />
            </View>

            {/* Contact Consent */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setContactConsent(!contactConsent)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, contactConsent && styles.checkboxChecked]}>
                {contactConsent && <Feather name="check" size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                {t('bugReport.contactConsentLabel', { defaultValue: 'Email me updates & receipt regarding this ticket' })}
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, mutation.isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
              activeOpacity={0.8}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>{t('bugReport.submitBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: D.colors.primary },
  headerSubtitle: { fontSize: 12, color: D.colors.textMuted },
  formContainer: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '800', color: D.colors.primary },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: D.colors.primary,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxLabel: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: D.radius.md,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    fontSize: 28,
    fontWeight: '900',
    color: '#22c55e',
    backgroundColor: '#DCFCE7',
    width: 52,
    height: 52,
    borderRadius: 26,
    textAlign: 'center',
    lineHeight: 52,
  },
  successTitle: { fontSize: 14, fontWeight: '800', color: D.colors.primary, textAlign: 'center' },
  ticketRefText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  closeBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  closeBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
