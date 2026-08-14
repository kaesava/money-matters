import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { trpc } from '../../lib/trpc';

export function HouseholdPartnerInviteSection() {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const inviteMutation = trpc.invitePartner.useMutation();

  const handleInvitePartner = async () => {
    if (!partnerEmail.trim() || !partnerEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid partner email address.');
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      setInviteSuccessMsg(`Invite link created! Share token: ${res.inviteToken}`);
      setPartnerEmail('');
    } catch (err) {
      Alert.alert('Invite Error', err instanceof Error ? err.message : 'Failed to generate partner invite.');
    } finally {
      setPartnerInviting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>👥 Invite Household Partner</Text>
      <Text style={styles.cardSubtitle}>
        Share visibility and joint budgeting across your household by inviting your partner.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="partner@example.com"
          placeholderTextColor="#94A3B8"
          value={partnerEmail}
          onChangeText={setPartnerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.inviteBtn, partnerInviting && { opacity: 0.7 }]}
          onPress={handleInvitePartner}
          disabled={partnerInviting}
          activeOpacity={0.8}
        >
          {partnerInviting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.inviteBtnText}>Send Invite</Text>
          )}
        </TouchableOpacity>
      </View>

      {inviteSuccessMsg && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{inviteSuccessMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1E293B',
  },
  inviteBtn: {
    backgroundColor: '#00B4A6',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 8,
  },
  successText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
});
