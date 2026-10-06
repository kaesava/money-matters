import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { useProfileBiometrics } from './useProfileBiometrics';
import { useProfileAvatarPicker } from './useProfileAvatarPicker';
import { useProfileSaveMutation } from './useProfileSaveMutation';

interface UseMobileProfileDataProps {
  onDirtyChange?: (isDirty: boolean) => void;
  registerDiscard?: (discardFn: () => void) => void;
}

export function useMobileProfileData({
  onDirtyChange,
  registerDiscard,
}: UseMobileProfileDataProps = {}) {
  const { data: session } = authClient.useSession();

  const userProfileQuery = trpc.getUserProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [storedEmail, setStoredEmail] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+61');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [language, setLanguage] = useState<'en'>('en');
  const [locale, setLocale] = useState('auto');
  const [showIcons, setShowIcons] = useState(true);

  const initialDataRef = useRef({
    name: '',
    notificationEmail: '',
    phoneCountryCode: '+61',
    phoneNumber: '',
    timezone: 'Australia/Sydney',
    language: 'en' as const,
    locale: 'auto',
    showIcons: true,
    avatarUri: null as string | null,
  });

  useEffect(() => {
    SecureStore.getItemAsync('money-matters_user_email')
      .then((em) => {
        if (em) setStoredEmail(em);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const prof = userProfileQuery.data;
    const pref = userPrefQuery.data;

    const uName = prof?.displayName || session?.user?.name || '';
    const uEmail = prof?.email || session?.user?.email || storedEmail || '';
    const uAvatar = prof?.avatarUrl || session?.user?.image || null;
    const uTz = prof?.timezone || pref?.timezone || 'Australia/Sydney';
    const uLang = 'en' as const;
    const uLoc = pref?.locale || 'auto';
    const uIcons = prof?.showIcons ?? pref?.showIcons ?? true;
    const uNotifEmail = prof?.notificationEmail || pref?.notificationEmail || uEmail;
    const uPhoneCode = prof?.phoneCountryCode || pref?.phoneCountryCode || '+61';
    const uPhoneNum = prof?.phoneNumber || pref?.phoneNumber || '';

    setName(uName);
    setNotificationEmail(uNotifEmail);
    setPhoneCountryCode(uPhoneCode);
    setPhoneNumber(uPhoneNum);
    setAvatarUri(uAvatar);
    setTimezone(uTz);
    setLanguage(uLang);
    setLocale(uLoc);
    setShowIcons(uIcons);

    initialDataRef.current = {
      name: uName,
      notificationEmail: uNotifEmail,
      phoneCountryCode: uPhoneCode,
      phoneNumber: uPhoneNum,
      timezone: uTz,
      language: uLang,
      locale: uLoc,
      showIcons: uIcons,
      avatarUri: uAvatar,
    };
  }, [userProfileQuery.data, userPrefQuery.data, session, storedEmail]);

  const {
    biometricsAvailable,
    biometricsEnabled,
    biometricLabel,
    handleToggleBiometrics,
  } = useProfileBiometrics();

  const { handlePickAvatar } = useProfileAvatarPicker({ setAvatarUri });

  const isDirty =
    name !== initialDataRef.current.name ||
    notificationEmail !== initialDataRef.current.notificationEmail ||
    phoneCountryCode !== initialDataRef.current.phoneCountryCode ||
    phoneNumber !== initialDataRef.current.phoneNumber ||
    timezone !== initialDataRef.current.timezone ||
    language !== initialDataRef.current.language ||
    locale !== initialDataRef.current.locale ||
    showIcons !== initialDataRef.current.showIcons ||
    avatarUri !== initialDataRef.current.avatarUri;

  useEffect(() => {
    onDirtyChange?.(isDirty && isEditing);
  }, [isDirty, isEditing, onDirtyChange]);

  const handleDiscard = useCallback(() => {
    const init = initialDataRef.current;
    setName(init.name);
    setNotificationEmail(init.notificationEmail);
    setPhoneCountryCode(init.phoneCountryCode);
    setPhoneNumber(init.phoneNumber);
    setTimezone(init.timezone);
    setLanguage(init.language);
    setLocale(init.locale);
    setShowIcons(init.showIcons);
    setAvatarUri(init.avatarUri);
    setPhoneError(undefined);
    setIsEditing(false);
  }, []);

  useEffect(() => {
    registerDiscard?.(handleDiscard);
  }, [handleDiscard, registerDiscard]);

  const handleCancel = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title'),
        message: t('modals.discardChanges.description'),
        confirmText: t('modals.discardChanges.discard'),
        cancelText: t('modals.discardChanges.cancel'),
        isDestructive: true,
        onConfirm: handleDiscard,
      });
    } else {
      setIsEditing(false);
    }
  };

  const { saving, handleSave: executeSave } = useProfileSaveMutation();

  const handleSave = () =>
    executeSave({
      name,
      notificationEmail,
      phoneCountryCode,
      phoneNumber,
      avatarUri,
      timezone,
      language,
      locale,
      showIcons,
      setPhoneError,
      onSuccess: () => {
        initialDataRef.current = {
          name: name.trim(),
          notificationEmail: notificationEmail.trim(),
          phoneCountryCode,
          phoneNumber: phoneNumber.trim(),
          timezone,
          language,
          locale,
          showIcons,
          avatarUri,
        };
        setIsEditing(false);
      },
    });

  return {
    name,
    setName,
    storedEmail,
    notificationEmail,
    setNotificationEmail,
    phoneCountryCode,
    setPhoneCountryCode,
    phoneNumber,
    setPhoneNumber,
    phoneError,
    avatarUri,
    timezone,
    setTimezone,
    language,
    setLanguage,
    locale,
    setLocale,
    showIcons,
    setShowIcons,
    biometricsAvailable,
    biometricsEnabled,
    biometricLabel,
    handleToggleBiometrics,
    isEditing,
    setIsEditing,
    saving,
    isDirty,
    handlePickAvatar,
    handleCancel,
    handleSave,
  };
}
