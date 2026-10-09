import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface ProfileAvatarSectionProps {
  avatarUri: string | null;
  name: string;
  onPickAvatar: () => void;
}

export function ProfileAvatarSection({
  avatarUri,
  name,
  onPickAvatar,
}: ProfileAvatarSectionProps) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View style={styles.avatarRow}>
      <TouchableOpacity
        onPress={onPickAvatar}
        style={styles.avatarContainer}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('settings.avatarUploadLabel')}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.cameraPill}>
          <Feather name="camera" size={14} color={DESIGN_TOKENS.colors.onAccent} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onPickAvatar} style={styles.changePhotoBtn}>
        <Text style={styles.changePhotoText}>{t('settings.avatarUploadLabel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: 14,
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  cameraPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DESIGN_TOKENS.colors.surface,
  },
  changePhotoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
  },
});
