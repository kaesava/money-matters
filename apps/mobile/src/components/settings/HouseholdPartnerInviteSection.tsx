import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useMobileToast, TypedConfirmDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { HouseholdMemberList, MemberItem } from './household/HouseholdMemberList';
import { PartnerInviteForm } from './household/PartnerInviteForm';

export function HouseholdPartnerInviteSection() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Member removal state
  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const inviteMutation = trpc.invitePartner.useMutation();
  const removeMemberMutation = trpc.removeHouseholdMember.useMutation();

  const gov = govQuery.data;
  const isOwner = gov?.isOwner ?? false;
  const membersList = (gov?.membersList ?? []) as MemberItem[];

  const handleInvitePartner = async () => {
    if (!partnerEmail.trim() || !partnerEmail.includes('@')) {
      toast.error(t('settings.members.invalidEmailWarning'), t('common.error'));
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      toast.success(t('settings.members.inviteSentSuccess', { email: res.email }));
      setInviteSuccessMsg(t('settings.members.inviteSentSuccess', { email: res.email }));
      setPartnerEmail('');
      govQuery.refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('settings.members.inviteFailed'),
        t('common.error')
      );
    } finally {
      setPartnerInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberMutation.mutateAsync({
        memberId: memberToRemove.id,
        targetUserId: memberToRemove.userId || undefined,
      });
      toast.success(
        t('settings.members.removeMemberSuccess', { name: memberToRemove.name }),
        t('common.success')
      );
      setMemberToRemove(null);
      utils.getHouseholdGovernanceInfo.invalidate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('settings.members.removeMemberFailed'),
        t('common.error')
      );
    }
  };

  return (
    <View style={styles.container}>
      <HouseholdMemberList
        membersList={membersList}
        isOwner={isOwner}
        onPressRemove={(m) => setMemberToRemove(m)}
      />

      <PartnerInviteForm
        isOwner={isOwner}
        partnerEmail={partnerEmail}
        onPartnerEmailChange={setPartnerEmail}
        partnerInviting={partnerInviting}
        onInvitePartner={handleInvitePartner}
        inviteSuccessMsg={inviteSuccessMsg}
      />

      <TypedConfirmDialog
        visible={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title={t('settings.removeMemberTitle')}
        subtitle={
          memberToRemove
            ? t('settings.removeMemberConfirm', { name: memberToRemove.name })
            : ''
        }
        confirmPhrase={memberToRemove?.name || ''}
        confirmLabel={t('settings.typeToConfirmLabel', {
          phrase: memberToRemove?.name || '',
        })}
        confirmButtonText={t('settings.members.removeAction')}
        variant="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
});
