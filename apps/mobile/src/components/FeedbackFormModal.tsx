import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  Linking,
} from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileInput,
  MobileButton,
  ChipSelect,
  FormLabel,
  FormErrorBanner,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { authClient } from '../lib/auth';
import { getMobileVersionInfo } from '../lib/version';
import { FeedbackDiagnosticsBox } from './dashboard/FeedbackDiagnosticsBox';

interface FeedbackFormModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackFormModal({ visible, onClose }: FeedbackFormModalProps) {
  const { data: session } = authClient.useSession();
  const versionInfo = getMobileVersionInfo();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('ui_ux');
  const [frustration, setFrustration] = useState<string>('LOW');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const resetForm = () => {
    setTitle('');
    setCategory('ui_ux');
    setFrustration('LOW');
    setDescription('');
    setEmail(session?.user?.email || '');
    setConsent(true);
    setTitleError('');
    setDescriptionError('');
    setGeneralError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!title.trim()) {
      setTitleError(t('feedback.errorSummaryRequired'));
      hasError = true;
    }
    if (!description.trim()) {
      setDescriptionError(t('feedback.errorDescriptionRequired'));
      hasError = true;
    }

    if (hasError) return;

    setTitleError('');
    setDescriptionError('');
    setGeneralError('');
    setSubmitting(true);

    try {
      const subject = encodeURIComponent(`[Feedback] ${title.trim()}`);
      const bodyLines = [
        `Category: ${category}`,
        `Severity: ${frustration}`,
        `Email: ${email.trim() || 'N/A'}`,
        `App Version: ${versionInfo?.formattedVersion || 'Money Matters Mobile'}`,
        '',
        'Description:',
        description.trim(),
      ];
      const body = encodeURIComponent(bodyLines.join('\n'));
      const mailtoUrl = `mailto:info@moneymatters.kaesava.au?subject=${subject}&body=${body}`;

      await Linking.openURL(mailtoUrl);
      handleClose();
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : t('feedback.openEmailFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = useMemo(() => [
    { key: 'setup', label: t('feedback.categories.setup') },
    { key: 'waterfall', label: t('feedback.categories.waterfall') },
    { key: 'bank_accounts', label: t('feedback.categories.bank_accounts') },
    { key: 'categories_bills', label: t('feedback.categories.categories_bills') },
    { key: 'ui_ux', label: t('feedback.categories.ui_ux') },
    { key: 'account_auth', label: t('feedback.categories.account_auth') },
    { key: 'other', label: t('feedback.categories.other') },
  ], []);

  const frustrationOptions = useMemo(() => [
    { key: 'LOW', label: t('feedback.severities.LOW') },
    { key: 'MEDIUM', label: t('feedback.severities.MEDIUM') },
    { key: 'HIGH', label: t('feedback.severities.HIGH') },
    { key: 'URGENT', label: t('feedback.severities.URGENT') },
  ], []);

  const isDirty = Boolean(title.trim() || description.trim());

  return (
    <MobileModalDialog
      visible={visible}
      onClose={handleClose}
      isDirty={isDirty}
      title={t('feedback.title')}
      subtitle={t('feedback.subtitle')}
      footer={
        <MobileButton
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!title.trim() || !description.trim()}
        >
          {t('feedback.submitCta')}
        </MobileButton>
      }
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FormErrorBanner message={generalError} />

        <MobileInput
          label={t('feedback.summaryLabel')}
          required
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            if (titleError) setTitleError('');
          }}
          placeholder={t('feedback.summaryPlaceholder')}
          error={titleError}
          autoFocus
        />

        <View style={styles.inputGroup}>
          <FormLabel>{t('feedback.categoryLabel')}</FormLabel>
          <ChipSelect
            options={categoryOptions}
            value={category}
            onChange={(val) => setCategory(val as typeof category)}
          />
        </View>

        <View style={styles.inputGroup}>
          <FormLabel>{t('feedback.severityLabel')}</FormLabel>
          <ChipSelect
            options={frustrationOptions}
            value={frustration}
            onChange={(val) => setFrustration(val as typeof frustration)}
          />
        </View>

        <MobileInput
          label={t('feedback.descriptionLabel')}
          required
          value={description}
          onChangeText={(val) => {
            setDescription(val);
            if (descriptionError) setDescriptionError('');
          }}
          placeholder={t('feedback.descriptionPlaceholder')}
          multiline
          numberOfLines={4}
          error={descriptionError}
        />

        <MobileInput
          label={t('feedback.emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder="your@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.consentRow}>
          <Switch
            value={consent}
            onValueChange={setConsent}
            trackColor={{ false: DESIGN_TOKENS.colors.slate[200], true: DESIGN_TOKENS.colors.sereneBlue }}
            thumbColor={consent ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.surface}
          />
          <Text style={styles.consentText}>
            Email me receipt & updates regarding this ticket
          </Text>
        </View>

        <FeedbackDiagnosticsBox
          formattedVersion={versionInfo.formattedVersion}
          channel={versionInfo.channel}
          gitCommit={versionInfo.gitCommit}
        />
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingBottom: 16,
  },
  inputGroup: {
    gap: 6,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  consentText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    flex: 1,
  },
});

export default FeedbackFormModal;
