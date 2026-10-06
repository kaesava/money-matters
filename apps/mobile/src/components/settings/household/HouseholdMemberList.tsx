import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface MemberItem {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isOwner?: boolean;
  isPending?: boolean;
  inviteStatus?: string | null;
}

export interface HouseholdMemberListProps {
  membersList: MemberItem[];
  isOwner: boolean;
  onPressRemove: (member: MemberItem) => void;
}

export function HouseholdMemberList({
  membersList,
  isOwner,
  onPressRemove,
}: HouseholdMemberListProps) {
  return (
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
                  <View style={styles.memberMeta}>
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
                    onPress={() => onPressRemove(m)}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  membersList: {
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.subtleText,
    fontStyle: 'italic',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
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
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  memberMeta: {
    flex: 1,
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
    color: DESIGN_TOKENS.colors.primary,
  },
  ownerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderRadius: 8,
  },
  ownerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  memberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 8,
  },
  memberBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  memberEmail: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.criticalDark,
  },
});
