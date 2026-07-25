import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../lib/trpc';

export interface InvitePartnerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
}

export const InvitePartnerModal: React.FC<InvitePartnerModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');

  const invitePartnerMutation = trpc.invitePartner.useMutation({
    onSuccess: (data) => {
      Alert.alert('Invite Sent! 🎉', `An invitation link has been generated for ${data.inviteEmail}`);
      setEmail('');
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  const handleSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    invitePartnerMutation.mutate({ email: email.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Invite Household Partner</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={DESIGN_TOKENS.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Manage finances together. Your partner will get full read/write access to your shared household budget.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Partner's Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="partner@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={invitePartnerMutation.isPending}
            activeOpacity={0.8}
          >
            {invitePartnerMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Send Household Invite</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: DESIGN_TOKENS.spacing.containerMargin,
  },
  modalCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    gap: DESIGN_TOKENS.spacing.stackGap,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 18,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: DESIGN_TOKENS.radius.default,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    height: 44,
    borderRadius: DESIGN_TOKENS.radius.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InvitePartnerModal;
