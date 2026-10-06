import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { MobileButton, FormLabel, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface PartnerInviteFormProps {
  isOwner: boolean;
  partnerEmail: string;
  onPartnerEmailChange: (val: string) => void;
  partnerInviting: boolean;
  onInvitePartner: () => void;
  inviteSuccessMsg: string | null;
}

export function PartnerInviteForm({
  isOwner,
  partnerEmail,
  onPartnerEmailChange,
  partnerInviting,
  onInvitePartner,
  inviteSuccessMsg,
}: PartnerInviteFormProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.addMemberTitle')}</Text>
      <Text style={styles.cardSubtitle}>{t('settings.members.inviteTooltip')}</Text>

      {!isOwner ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            ℹ️ {t('settings.members.onlyOwnerCanInvite')}
          </Text>
        </View>
      ) : (
        <View style={styles.inviteForm}>
          <View style={styles.inputGroup}>
            <FormLabel label={t('settings.members.emailAddressLabel')} required />
            <TextInput
              style={styles.textInput}
              placeholder="housemate@example.com"
              placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
              value={partnerEmail}
              onChangeText={onPartnerEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.btnRow}>
            <MobileButton
              variant="primary"
              label={t('settings.members.sendInvitationCta')}
              onPress={onInvitePartner}
              loading={partnerInviting}
              disabled={partnerInviting || !partnerEmail.trim()}
            />
          </View>
        </View>
      )}

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
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 16,
  },
  noticeBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  noticeText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 16,
  },
  inviteForm: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary,
  },
  btnRow: {
    alignItems: 'flex-start',
  },
  successBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
  },
  successText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.successDark,
    fontWeight: '600',
  },
});
