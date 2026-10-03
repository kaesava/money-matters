import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useMobileToast,
  MobileButton,
  FormLabel,
  TypedConfirmDialog,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';

interface MemberItem {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isOwner?: boolean;
  isPending?: boolean;
  inviteStatus?: string | null;
}

export function HouseholdPartnerInviteSection() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Member removal state
  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
    setIsRemoving(true);
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
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Household Members List */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>{t('settings.members.title')}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{t('settings.members.tooltip')}</Text>

        <View style={styles.membersList}>
          {membersList.length === 0 ? (
            <Text style={styles.emptyText}>{t('settings.members.noMembers')}</Text>
          ) : (
            membersList.map((m) => {
              const initials = m.name
                ? m.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : '?';

              return (
                <View key={m.id || m.userId || m.email} style={styles.memberItem}>
                  <View style={styles.memberLeft}>
                    {m.avatarUrl ? (
                      <Image source={{ uri: m.avatarUrl }} style={styles.memberAvatar} />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberAvatarInitials}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameBadgeRow}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        {m.isOwner ? (
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>
                              {t('settings.members.roleOwner')}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>
                              {t('settings.members.roleMember')}
                            </Text>
                          </View>
                        )}
                        {(m.isPending || m.inviteStatus === 'PENDING') && (
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>
                              ⌛ {t('partner.pendingAcceptance')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberEmail}>{m.email}</Text>
                    </View>
                  </View>

                  {isOwner && !m.isOwner && (
                    <TouchableOpacity
                      onPress={() => setMemberToRemove(m)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>
                        {t('settings.members.removeAction')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Invite Member Card */}
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
                placeholderTextColor="#94A3B8"
                value={partnerEmail}
                onChangeText={setPartnerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.btnRow}>
              <MobileButton
                variant="primary"
                label={t('settings.members.sendInvitationCta')}
                onPress={handleInvitePartner}
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

      {/* Owner Remove Member Confirmation Dialog */}
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  membersList: {
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  memberEmail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  ownerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
  },
  ownerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  memberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  memberBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  noticeBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  inviteForm: {
    gap: 10,
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1B2B4B',
  },
  btnRow: {
    alignItems: 'flex-end',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
  },
  successText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
});
