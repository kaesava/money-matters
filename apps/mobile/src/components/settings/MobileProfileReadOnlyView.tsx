import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SettingsCard,
  ReadOnlyField,
  SwitchRow,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_LOCALES } from '@money-matters/types';

interface MobileProfileReadOnlyViewProps {
  name: string;
  email: string;
  notificationEmail?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  avatarUri: string | null;
  timezone: string;
  language: 'en';
  locale: string;
  showIcons: boolean;
  biometricsAvailable: boolean;
  biometricsEnabled: boolean;
  biometricLabel: string;
  onToggleBiometrics: () => void;
  onEdit: () => void;
}

export function MobileProfileReadOnlyView({
  name,
  email,
  notificationEmail,
  phoneCountryCode,
  phoneNumber,
  avatarUri,
  timezone,
  language,
  locale,
  showIcons,
  biometricsAvailable,
  biometricsEnabled,
  biometricLabel,
  onToggleBiometrics,
  onEdit,
}: MobileProfileReadOnlyViewProps) {
  const selectedLocale = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <SettingsCard
      title={t('settings.myDetailsTitle')}
      action={
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Feather name="edit-2" size={13} color="#2563eb" />
          <Text style={styles.editBtnText}>{t('common.edit')}</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* Avatar & Identity Header */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{name || t('common.user')}</Text>
            <Text style={styles.userEmail}>{email || '—'}</Text>
          </View>
        </View>

        {/* Read-Only Details */}
        <View style={styles.detailsList}>
          <ReadOnlyField label={t('settings.displayNameLabel')} value={name} />
          <ReadOnlyField label={t('settings.loginEmailLabel')} value={email} />
          <ReadOnlyField
            label={t('settings.notificationEmailLabel')}
            value={notificationEmail || email}
          />
          <ReadOnlyField
            label={t('settings.phoneNumberLabel')}
            value={phoneNumber ? `${phoneCountryCode || '+61'} ${phoneNumber}` : '—'}
          />
          <ReadOnlyField
            label={t('settings.language')}
            value={language === 'en' ? 'English (en)' : 'English (en)'}
          />
          <ReadOnlyField
            label={t('settings.dateFormat')}
            value={`${selectedLocale.label} (${selectedLocale.dateFormatExample})`}
          />
          <ReadOnlyField label={t('settings.items.timezone')} value={timezone} />
          <ReadOnlyField
            label={t('settings.items.showIcons')}
            value={showIcons ? '✓ Visible' : '✕ Hidden'}
          />
        </View>

        {/* Biometrics Switch */}
        {biometricsAvailable && (
          <View style={styles.biometricsContainer}>
            <SwitchRow
              label={`${biometricLabel} App Lock`}
              hint="Auto-locks after 2 minutes of background inactivity to protect your stealth privacy."
              value={biometricsEnabled}
              onValueChange={onToggleBiometrics}
            />
          </View>
        )}
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  detailsList: {
    gap: 4,
  },
  biometricsContainer: {
    marginTop: 4,
  },
});
