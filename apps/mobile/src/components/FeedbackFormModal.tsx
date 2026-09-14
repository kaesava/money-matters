import React, { useState } from 'react';
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
  FormFieldError,
  FormErrorBanner,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { authClient } from '../lib/auth';
import { getMobileVersionInfo } from '../lib/version';

interface FeedbackFormModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { key: 'setup', label: 'Onboarding & Setup' },
  { key: 'waterfall', label: 'Payday Allocation & Split' },
  { key: 'bank_accounts', label: 'Bank Accounts & Balances' },
  { key: 'categories_bills', label: 'Categories & Bills' },
  { key: 'ui_ux', label: 'App Display & Navigation' },
  { key: 'account_auth', label: 'Account & Security' },
  { key: 'other', label: 'General Feedback' },
] as const;

const FRUSTRATIONS = [
  { key: 'LOW', label: 'Minor Suggestion' },
  { key: 'MEDIUM', label: 'Mild Inconvenience' },
  { key: 'HIGH', label: 'Disrupted Workflow' },
  { key: 'URGENT', label: 'Critical Blocker' },
] as const;

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
      setTitleError('Please enter a feedback summary.');
      hasError = true;
    }
    if (!description.trim()) {
      setDescriptionError('Please describe your feedback or issue.');
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
      const mailtoUrl = `mailto:support@moneymatters.kaesava.au?subject=${subject}&body=${body}`;

      await Linking.openURL(mailtoUrl);
      handleClose();
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to open email client.');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
  }));

  const frustrationOptions = FRUSTRATIONS.map((f) => ({
    key: f.key,
    label: f.label,
  }));

  const isDirty = Boolean(title.trim() || description.trim());

  return (
    <MobileModalDialog
      visible={visible}
      onClose={handleClose}
      isDirty={isDirty}
      title="💬 Provide Feedback"
      subtitle="Help shape Money Matters for Android"
      footer={
        <MobileButton
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!title.trim() || !description.trim()}
        >
          Send Feedback
        </MobileButton>
      }
    >
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <FormErrorBanner message={generalError} />

        {/* Feedback Summary */}
        <MobileInput
          label="Feedback Summary"
          required
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            if (titleError) setTitleError('');
          }}
          placeholder="Brief summary of your feedback or issue..."
          error={titleError}
          autoFocus
        />

        {/* Workflow Category Chips */}
        <View style={styles.inputGroup}>
          <FormLabel>Workflow Category</FormLabel>
          <ChipSelect
            options={categoryOptions}
            value={category}
            onChange={(val) => setCategory(val as typeof category)}
          />
        </View>

        {/* Frustration Level */}
        <View style={styles.inputGroup}>
          <FormLabel>Frustration Level</FormLabel>
          <ChipSelect
            options={frustrationOptions}
            value={frustration}
            onChange={(val) => setFrustration(val as typeof frustration)}
          />
        </View>

        {/* Description */}
        <MobileInput
          label="Description & Details"
          required
          value={description}
          onChangeText={(val) => {
            setDescription(val);
            if (descriptionError) setDescriptionError('');
          }}
          placeholder="Describe your feedback, suggestion, or what happened in detail..."
          multiline
          numberOfLines={4}
          error={descriptionError}
        />

        {/* Contact Email */}
        <MobileInput
          label="Receipt / Contact Email"
          value={email}
          onChangeText={setEmail}
          placeholder="your@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

            {/* Consent Toggle */}
            <View style={styles.consentRow}>
              <Switch
                value={consent}
                onValueChange={setConsent}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={consent ? '#2563eb' : '#F8FAFC'}
              />
              <Text style={styles.consentText}>
                Email me receipt & updates regarding this ticket
              </Text>
            </View>

            {/* Telemetry Summary Box */}
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryTitle}>📱 Captured Diagnostics</Text>
              <Text style={styles.telemetryItem}>App: Money Matters {versionInfo.formattedVersion}</Text>
              <Text style={styles.telemetryItem}>Platform: Android ({versionInfo.channel} channel)</Text>
              <Text style={styles.telemetryItem}>Commit: {versionInfo.gitCommit}</Text>
            </View>
          </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  requiredStar: {
    color: '#DC2626',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 90,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  chipUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#2563eb',
    fontWeight: '800',
  },
  chipTextUrgent: {
    color: '#DC2626',
    fontWeight: '800',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  consentText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  telemetryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  telemetryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  telemetryItem: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default FeedbackFormModal;
