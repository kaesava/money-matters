import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { Feather } from '@expo/vector-icons';

type BugCategory = 'budgeting' | 'transactions' | 'bank_accounts' | 'ui_ux' | 'auth' | 'other';
type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export default function MobileBugReportScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BugCategory>('budgeting');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = trpc.createBugReport.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        err.message || t('bugReport.errorMsg')
      );
    },
  });

  const handleSubmit = () => {
    if (title.trim().length < 3 || description.trim().length < 10) {
      Alert.alert(
        t('common.error', { defaultValue: 'Validation Error' }),
        t('bugReport.errorMsg')
      );
      return;
    }

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: '1.0.0-beta',
      pageUrl: '/(app)/settings/bug-report',
      deviceInfo: `${Platform.OS} ${Platform.Version}`,
    });
  };

  const D = DESIGN_TOKENS;

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

        {/* Beta Notice Callout Banner */}
        <View style={styles.betaCard}>
          <Text style={styles.betaTitle}>🧪 {t('bugReport.betaNoticeTitle')}</Text>
          <Text style={styles.betaBody}>{t('bugReport.betaNoticeBody')}</Text>
        </View>

        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>{t('bugReport.successMsg')}</Text>
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

            {/* Category Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('bugReport.formCategoryLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(['budgeting', 'transactions', 'bank_accounts', 'ui_ux', 'auth', 'other'] as BugCategory[]).map(
                  (cat) => (
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
                  )
                )}
              </ScrollView>
            </View>

            {/* Severity Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('bugReport.formSeverityLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(['low', 'medium', 'high', 'critical'] as BugSeverity[]).map((sev) => (
                  <TouchableOpacity
                    key={sev}
                    style={[styles.chip, severity === sev && styles.chipActive]}
                    onPress={() => setSeverity(sev)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, severity === sev && styles.chipTextActive]}>
                      {t(`bugReport.severities.${sev}` as const)}
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
  betaCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: D.radius.md,
    padding: 14,
    gap: 4,
  },
  betaTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  betaBody: { fontSize: 12, color: '#B45309', lineHeight: 18 },
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
  closeBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  closeBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
