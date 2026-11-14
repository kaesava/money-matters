import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useMobileToast, TypedConfirmDialog, MobileConfirmDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { HouseholdMemberList, MemberItem } from './household/HouseholdMemberList';
import { HouseholdMemberInviteForm } from './household/HouseholdMemberInviteForm';
import { useAppFeatures } from '../../context/useAppFeatures';

export function HouseholdMemberInviteSection() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { hasPartnerInvites } = useAppFeatures();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Member removal state
  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null);
  const [selfDemoteTarget, setSelfDemoteTarget] = useState<MemberItem | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const inviteMutation = trpc.invitePartner.useMutation();
  const removeMemberMutation = trpc.removeHouseholdMember.useMutation();
  const updateRoleMutation = trpc.updateHouseholdMemberRole.useMutation();

  const gov = govQuery.data;
  const isOwner = gov?.isOwner ?? false;
  const isSoleOwner = gov?.isSoleOwner ?? false;
  const currentUserId = gov?.currentUserId ?? null;
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

  const executeRoleChange = async (member: MemberItem, newRole: "OWNER" | "MEMBER") => {
    setIsUpdatingRole(true);
    try {
      await updateRoleMutation.mutateAsync({
        memberId: member.id,
        targetUserId: member.userId || undefined,
        newRole,
      });
      toast.success(
        t('settings.members.changeRoleSuccess', {
          role: t(`settings.members.role${newRole === 'OWNER' ? 'Owner' : 'Member'}`),
          name: member.name,
        }),
        t('common.success')
      );
      await Promise.all([
        utils.getHouseholdGovernanceInfo.invalidate(),
        utils.getActiveAllocationStrategy.invalidate(),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('settings.members.changeRoleFailed'),
        t('common.error')
      );
    } finally {
      setIsUpdatingRole(false);
      setSelfDemoteTarget(null);
    }
  };

  const handleChangeRole = (member: MemberItem, newRole: "OWNER" | "MEMBER") => {
    const isSelf = currentUserId && member.userId === currentUserId;
    if (isSelf && newRole === 'MEMBER') {
      setSelfDemoteTarget(member);
      return;
    }
    executeRoleChange(member, newRole);
  };

  return (
    <View style={styles.container}>
      <HouseholdMemberList
        membersList={membersList}
        isOwner={isOwner}
        isSoleOwner={isSoleOwner}
        onPressRemove={(m) => setMemberToRemove(m)}
        onChangeRole={handleChangeRole}
      />

      {hasPartnerInvites && (
        <HouseholdMemberInviteForm
          isOwner={isOwner}
          partnerEmail={partnerEmail}
          onPartnerEmailChange={setPartnerEmail}
          partnerInviting={partnerInviting}
          onInvitePartner={handleInvitePartner}
          inviteSuccessMsg={inviteSuccessMsg}
        />
      )}

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

      <MobileConfirmDialog
        visible={Boolean(selfDemoteTarget)}
        onCancel={() => setSelfDemoteTarget(null)}
        onConfirm={() => selfDemoteTarget && executeRoleChange(selfDemoteTarget, "MEMBER")}
        title={t('settings.members.demoteSelfTitle')}
        message={t('settings.members.demoteSelfConfirm')}
        confirmLabel={t('settings.members.demoteSelfConfirmButton')}
        cancelLabel={t('common.cancel')}
        isDestructive={true}
        isLoading={isUpdatingRole}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
});
