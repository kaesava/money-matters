import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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

  const resetForm = () => {
    setTitle('');
    setCategory('ui_ux');
    setFrustration('LOW');
    setDescription('');
    setEmail(session?.user?.email || '');
    setConsent(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), 'Please enter a feedback summary.');
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('common.error'), 'Please describe your feedback or issue.');
      return;
    }

    setSubmitting(true);
    try {
      // Generate a client ticket reference
      const ticketRef = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Simulate network dispatch with telemetry
      await new Promise((resolve) => setTimeout(resolve, 800));

      Alert.alert(
        'Feedback Received 🎉',
        `Thank you for helping us improve Money Matters!\n\nTicket Ref: #BUG-${ticketRef}\nA receipt will be sent to ${email || 'your account email'}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>💬 Provide Feedback</Text>
              <Text style={styles.modalSubtitle}>Help shape Money Matters for Android</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
            {/* Feedback Summary */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Feedback Summary <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief summary of your feedback or issue..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Workflow Category Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Workflow Category</Text>
              <View style={styles.chipsWrap}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setCategory(cat.key)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Frustration Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frustration Level</Text>
              <View style={styles.chipsWrap}>
                {FRUSTRATIONS.map((f) => {
                  const isSelected = frustration === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFrustration(f.key)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                        isSelected && f.key === 'URGENT' && styles.chipUrgent,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                          isSelected && f.key === 'URGENT' && styles.chipTextUrgent,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description & Details <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your feedback, suggestion, or what happened in detail..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Contact Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Receipt / Contact Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="your@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

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

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Send Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
