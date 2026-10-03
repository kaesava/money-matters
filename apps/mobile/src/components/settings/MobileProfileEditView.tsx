import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  MobileButton,
  FormLabel,
  FormFieldError,
  SwitchRow,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_LOCALES, COMMON_TIMEZONES } from '@money-matters/types';

interface MobileProfileEditViewProps {
  name: string;
  setName: (val: string) => void;
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
  language,
  setLanguage,
  locale,
  setLocale,
  showIcons,
  setShowIcons,
  saving,
  onSave,
  onCancel,
}: MobileProfileEditViewProps) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

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
      <View style={styles.avatarRow}>
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <TouchableOpacity onPress={onPickAvatar} style={styles.cameraPill}>
            <Feather name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onPickAvatar} style={styles.changePhotoBtn}>
          <Text style={styles.changePhotoText}>{t('settings.avatarUploadLabel')}</Text>
        </TouchableOpacity>
      </View>

      {/* Name (Mandatory) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.displayNameLabel')} required />
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={t('settings.displayNamePlaceholder')}
          placeholderTextColor="#94A3B8"
        />
        {!name.trim() && (
          <FormFieldError error={t('settings.displayNameRequired')} />
        )}
      </View>

      {/* Notification Email (Mandatory) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.notificationEmailLabel')} required />
        <TextInput
          style={styles.textInput}
          value={notificationEmail}
          onChangeText={setNotificationEmail}
          placeholder="alerts@example.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.hintText}>{t('settings.notificationEmailHint')}</Text>
      </View>

      {/* Phone Number */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.phoneNumberLabel')} />
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.phoneCodeInput}
            value={phoneCountryCode}
            onChangeText={setPhoneCountryCode}
            placeholder="+61"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            style={styles.phoneNumberInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="412 345 678"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />
        </View>
        {phoneError ? <FormFieldError error={phoneError} /> : null}
      </View>

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

      {/* Date Format */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.dateFormat')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {SUPPORTED_LOCALES.map((l) => {
            const isSelected = locale === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLocale(l.code)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {l.label} ({l.dateFormatExample})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timezone (COMMON_TIMEZONES) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.items.timezone')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {COMMON_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz.value;
            return (
              <TouchableOpacity
                key={tz.value}
                onPress={() => setTimezone(tz.value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Show Icons Switch */}
      <SwitchRow
        label={t('settings.items.showIcons')}
        hint={t('settings.items.showIconsHint')}
        value={showIcons}
        onValueChange={setShowIcons}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1B2B4B',
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
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cameraPill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  changePhotoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B2B4B',
  },
  hintText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneCodeInput: {
    width: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B2B4B',
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B2B4B',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  chipTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
