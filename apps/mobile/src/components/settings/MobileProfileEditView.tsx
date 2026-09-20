import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_LOCALES } from '@money-matters/types';
import { MOBILE_COMMON_TIMEZONES } from './timezones';
import { profileEditStyles as styles } from './profileEditStyles';

interface MobileProfileEditViewProps {
  name: string;
  setName: (val: string) => void;
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
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>{t('settings.myDetailsTitle')}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            style={[styles.saveBtnTop, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnTextTop}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar Picker */}
      <View style={styles.avatarRow}>
        <TouchableOpacity onPress={onPickAvatar} style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraPill}>
            <Feather name="camera" size={11} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onPickAvatar} style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>{t('settings.avatarUploadLabel')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {t('settings.displayNameLabel')} <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={t('settings.displayNamePlaceholder')}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Language Chips */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('settings.language')}</Text>
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

      {/* Date Format Chips */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('settings.dateFormat')}</Text>
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

      {/* Timezone Chips */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('settings.items.timezone')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {MOBILE_COMMON_TIMEZONES.map((tz) => {
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

      {/* Show Information Icons Toggle */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.toggleTitle}>{t('settings.items.showIcons')}</Text>
          <Text style={styles.toggleSubtitle}>{t('settings.items.showIconsHint')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowIcons(!showIcons)}
          style={[styles.toggleBtn, showIcons && styles.toggleBtnActive]}
        >
          <View style={[styles.toggleThumb, showIcons && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>

      {/* Footer Save / Cancel */}
      <View style={styles.footerRow}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtnBottom}>
          <Text style={styles.cancelBtnBottomText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[styles.saveBtnBottom, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnBottomText}>{t('settings.saveProfileCta')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

