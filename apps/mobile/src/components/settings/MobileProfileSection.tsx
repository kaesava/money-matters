import React, { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useIconVisibility, useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import {
  checkBiometricsAvailable,
  getBiometricTypeLabel,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateWithBiometrics,
} from '../../lib/biometrics';
import * as SecureStore from 'expo-secure-store';
import { MobileProfileReadOnlyView } from './MobileProfileReadOnlyView';
import { MobileProfileEditView } from './MobileProfileEditView';

export function MobileProfileSection() {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const toast = useMobileToast();
  const { setShowIcons: setContextShowIcons } = useIconVisibility();

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [storedEmail, setStoredEmail] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+61');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [language, setLanguage] = useState<'en'>('en');
  const [locale, setLocale] = useState('auto');
  const [showIcons, setShowIcons] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('money-matters_user_email')
      .then((em) => {
        if (em) setStoredEmail(em);
      })
      .catch(() => {});
  }, []);

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [saving, setSaving] = useState(false);

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
    const uName = session?.user?.name || '';
    const uEmail = session?.user?.email || storedEmail || '';
    const uAvatar = session?.user?.image || null;
    const uTz = userPrefQuery.data?.timezone || 'Australia/Sydney';
    const uLang = 'en' as const;
    const uLoc = userPrefQuery.data?.locale || 'auto';
    const uIcons = userPrefQuery.data?.showIcons ?? true;
    const uNotifEmail = userPrefQuery.data?.notificationEmail || uEmail;
    const uPhoneCode = userPrefQuery.data?.phoneCountryCode || '+61';
    const uPhoneNum = userPrefQuery.data?.phoneNumber || '';

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

    checkBiometricsAvailable().then(setBiometricsAvailable).catch(() => {});
    getBiometricTypeLabel().then(setBiometricLabel).catch(() => {});
    isBiometricLockEnabled().then(setBiometricsEnabled).catch(() => {});
  }, [session, userPrefQuery.data, storedEmail]);

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

  const handleToggleBiometrics = async () => {
    const nextState = !biometricsEnabled;
    if (nextState) {
      const authenticated = await authenticateWithBiometrics('Enable biometric security for Money Matters');
      if (authenticated) {
        await setBiometricLockEnabled(true);
        setBiometricsEnabled(true);
      }
    } else {
      await setBiometricLockEnabled(false);
      setBiometricsEnabled(false);
    }
  };

  const updatePrefMut = trpc.updateUserPreferences.useMutation();

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.warning(
        'Please grant access to your photo library to choose a profile avatar.',
        'Permission Required'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imageBase64 = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setAvatarUri(imageBase64);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.discardChanges.title'),
        message: t('modals.discardChanges.description'),
        confirmText: t('modals.discardChanges.discard'),
        cancelText: t('modals.discardChanges.cancel'),
        isDestructive: true,
        onConfirm: () => {
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
          setIsEditing(false);
        },
      });
    } else {
      setIsEditing(false);
    }
  };

  const updateProfileMut = trpc.updateUserProfile.useMutation();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required.', t('common.error'));
      return;
    }

    setSaving(true);
    try {
      await updatePrefMut.mutateAsync({
        timezone,
        language,
        locale,
        showIcons,
      });

      try {
        await updateProfileMut.mutateAsync({
          displayName: name.trim(),
          notificationEmail: notificationEmail.trim() || session?.user?.email || storedEmail,
          phoneCountryCode,
          phoneNumber: phoneNumber.trim(),
          avatarUrl: avatarUri || undefined,
        });
      } catch (_e) {
        // Non-blocking fallback
      }

      try {
        await authClient.updateUser({
          name: name.trim(),
          image: avatarUri || undefined,
        });
      } catch (_e) {
        // Silent fallback
      }

      initialDataRef.current = {
        name: name.trim(),
        notificationEmail,
        phoneCountryCode,
        phoneNumber,
        timezone,
        language,
        locale,
        showIcons,
        avatarUri,
      };

      setContextShowIcons(showIcons);
      await utils.getUserPreferences.invalidate();
      await utils.getUserProfile.invalidate();
      setIsEditing(false);
      toast.success('Profile updated successfully.', t('common.success'));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update profile',
        t('common.error')
      );
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <MobileProfileEditView
        name={name}
        setName={setName}
        notificationEmail={notificationEmail}
        setNotificationEmail={setNotificationEmail}
        phoneCountryCode={phoneCountryCode}
        setPhoneCountryCode={setPhoneCountryCode}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        avatarUri={avatarUri}
        onPickAvatar={handlePickAvatar}
        timezone={timezone}
        setTimezone={setTimezone}
        language={language}
        setLanguage={setLanguage}
        locale={locale}
        setLocale={setLocale}
        showIcons={showIcons}
        setShowIcons={setShowIcons}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <MobileProfileReadOnlyView
      name={name}
      email={session?.user?.email || storedEmail || ''}
      notificationEmail={notificationEmail}
      phoneCountryCode={phoneCountryCode}
      phoneNumber={phoneNumber}
      avatarUri={avatarUri}
      timezone={timezone}
      language={language}
      locale={locale}
      showIcons={showIcons}
      biometricsAvailable={biometricsAvailable}
      biometricsEnabled={biometricsEnabled}
      biometricLabel={biometricLabel}
      onToggleBiometrics={handleToggleBiometrics}
      onEdit={() => setIsEditing(true)}
    />
  );
}
