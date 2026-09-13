import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_LOCALES } from '@money-matters/types';
import { profileReadOnlyStyles as styles } from './profileReadOnlyStyles';

interface MobileProfileReadOnlyViewProps {
  name: string;
  email: string;
  avatarUri: string | null;
  timezone: string;
  language: 'en' | 'ja';
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

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>👤 {t('settings.myDetailsTitle', { defaultValue: 'My Details' })}</Text>
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Feather name="edit-2" size={13} color="#2563eb" />
          <Text style={styles.editBtnText}>{t('common.edit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Row */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{name || t('common.user')}</Text>
          <Text style={styles.userEmail}>{email || '—'}</Text>
        </View>
      </View>

      {/* Read-Only Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.displayNameLabel')}</Text>
          <Text style={styles.detailValue}>{name || '—'}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.loginEmailLabel')}</Text>
          <Text style={styles.detailValue}>{email || '—'}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.language')}</Text>
          <Text style={styles.detailValue}>
            {language === 'ja' ? '日本語 (ja)' : 'English (en)'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.dateFormat')}</Text>
          <Text style={styles.detailValue}>
            {selectedLocale.label} ({selectedLocale.dateFormatExample})
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.items.timezone')}</Text>
          <Text style={styles.detailValue}>{timezone}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.items.showIcons')}</Text>
          <Text style={styles.detailValue}>
            {showIcons ? '✓ Visible' : '✕ Hidden'}
          </Text>
        </View>
      </View>

      {/* Biometric Security Toggle */}
      {biometricsAvailable && (
        <View style={styles.securityRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="shield" size={15} color="#2563eb" />
              <Text style={styles.securityTitle}>{biometricLabel} App Lock</Text>
            </View>
            <Text style={styles.securitySubtitle}>
              Auto-locks after 2 minutes of background inactivity to protect your stealth privacy.
            </Text>
          </View>
          <TouchableOpacity
            onPress={onToggleBiometrics}
            style={[
              styles.toggleBtn,
              biometricsEnabled && styles.toggleBtnActive,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                biometricsEnabled && styles.toggleThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

