import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  MobileButton,
  FormLabel,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { ProfileAvatarSection } from './profile/ProfileAvatarSection';
import { ProfileContactFields } from './profile/ProfileContactFields';
import { ProfilePreferencesFields } from './profile/ProfilePreferencesFields';

interface MobileProfileEditViewProps {
  name: string;
  setName: (val: string) => void;
  loginEmail?: string;
  notificationEmail: string;
  setNotificationEmail: (val: string) => void;
  phoneCountryCode: string;
  setPhoneCountryCode: (val: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  phoneError?: string;
  avatarUri: string | null;
  onPickAvatar: () => void;
  timezone: string;
  setTimezone: (val: string) => void;
  language: 'en';
  setLanguage: (val: 'en') => void;
  locale: string;
  setLocale: (val: string) => void;
  showIcons: boolean;
  setShowIcons: (val: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function MobileProfileEditView({
  name,
  setName,
  loginEmail,
  notificationEmail,
  setNotificationEmail,
  phoneCountryCode,
  setPhoneCountryCode,
  phoneNumber,
  setPhoneNumber,
  phoneError,
  avatarUri,
  onPickAvatar,
  timezone,
  setTimezone,
  setLanguage,
  locale,
  setLocale,
  showIcons,
  setShowIcons,
  saving,
  onSave,
  onCancel,
}: MobileProfileEditViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>{t('settings.editProfileTitle')}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar Picker Row */}
      <ProfileAvatarSection
        avatarUri={avatarUri}
        name={name}
        onPickAvatar={onPickAvatar}
      />

      {/* Contact Fields (Name, Login Email, Notification Email, Phone Number) */}
      <ProfileContactFields
        name={name}
        setName={setName}
        loginEmail={loginEmail}
        notificationEmail={notificationEmail}
        setNotificationEmail={setNotificationEmail}
        phoneCountryCode={phoneCountryCode}
        setPhoneCountryCode={setPhoneCountryCode}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        phoneError={phoneError}
      />

      {/* Language */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.language')} />
        <View style={styles.chipRow}>
          <TouchableOpacity
            onPress={() => setLanguage('en')}
            style={[styles.chip, styles.chipSelected]}
          >
            <Text style={[styles.chipText, styles.chipTextSelected]}>
              English (en)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences (Locale, Timezone, Icons) */}
      <ProfilePreferencesFields
        locale={locale}
        setLocale={setLocale}
        timezone={timezone}
        setTimezone={setTimezone}
        showIcons={showIcons}
        setShowIcons={setShowIcons}
      />

      {/* Bottom Actions */}
      <View style={styles.footerRow}>
        <MobileButton
          variant="secondary"
          label={t('common.cancel')}
          onPress={onCancel}
        />
        <MobileButton
          variant="primary"
          label={t('settings.saveProfileCta')}
          onPress={onSave}
          loading={saving}
          disabled={saving || !name.trim() || !notificationEmail.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 16,
    gap: 14,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  inputGroup: {
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
  },
  scrollRow: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    backgroundColor: DESIGN_TOKENS.colors.background,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  chipText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
  },
  chipTextSelected: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
