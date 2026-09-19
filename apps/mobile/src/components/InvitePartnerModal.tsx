import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileInput,
  MobileButton,
  FormErrorBanner,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
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
  const toast = useMobileToast();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const invitePartnerMutation = trpc.invitePartner.useMutation({
    onSuccess: (data) => {
      toast.success(
        t('partner.inviteSentSuccess', { email: data.inviteEmail }),
        t('partner.inviteSent')
      );
      setEmail('');
      setEmailError('');
      setGeneralError('');
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setGeneralError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      setEmailError(t('partner.invalidEmailAlertBody'));
      return;
    }
    setEmailError('');
    setGeneralError('');
    invitePartnerMutation.mutate({ email: email.trim() });
  };

  const isDirty = Boolean(email.trim());

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={t('partner.inviteTitle')}
      subtitle={t('partner.inviteSubtitle')}
      footer={
        <MobileButton
          variant="primary"
          onPress={handleSubmit}
          loading={invitePartnerMutation.isPending}
          disabled={!email.trim()}
        >
          {t('partner.sendInvite')}
        </MobileButton>
      }
    >
      <View style={styles.content}>
        <FormErrorBanner message={generalError} />

        <MobileInput
          label={t('partner.emailLabel')}
          required
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (emailError) setEmailError('');
          }}
          placeholder={t('partner.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          autoFocus
        />
      </View>
    </MobileModalDialog>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});

export default InvitePartnerModal;
