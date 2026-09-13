import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useIconVisibility } from '@money-matters/ui/mobile';
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
import { MobileProfileReadOnlyView } from './MobileProfileReadOnlyView';
import { MobileProfileEditView } from './MobileProfileEditView';

export function MobileProfileSection() {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const { setShowIcons: setContextShowIcons } = useIconVisibility();

  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('Australia/Sydney');
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const [locale, setLocale] = useState('auto');
  const [showIcons, setShowIcons] = useState(true);

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef({
    name: '',
    timezone: 'Australia/Sydney',
    language: 'en' as 'en' | 'ja',
    locale: 'auto',
    showIcons: true,
    avatarUri: null as string | null,
  });

  useEffect(() => {
    const uName = session?.user?.name || '';
    const uAvatar = session?.user?.image || null;
    const uTz = userPrefQuery.data?.timezone || 'Australia/Sydney';
    const uLang = (userPrefQuery.data?.language as 'en' | 'ja') || 'en';
    const uLoc = userPrefQuery.data?.locale || 'auto';
    const uIcons = userPrefQuery.data?.showIcons ?? true;

    setName(uName);
    setAvatarUri(uAvatar);
    setTimezone(uTz);
    setLanguage(uLang);
    setLocale(uLoc);
    setShowIcons(uIcons);

    initialDataRef.current = {
      name: uName,
      timezone: uTz,
      language: uLang,
      locale: uLoc,
      showIcons: uIcons,
      avatarUri: uAvatar,
    };

    checkBiometricsAvailable().then(setBiometricsAvailable).catch(() => {});
    getBiometricTypeLabel().then(setBiometricLabel).catch(() => {});
    isBiometricLockEnabled().then(setBiometricsEnabled).catch(() => {});
  }, [session, userPrefQuery.data]);

  const isDirty =
    name !== initialDataRef.current.name ||
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
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to choose a profile avatar.'
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
      Alert.alert(
        t('modals.discardChanges.title', { defaultValue: 'Discard changes?' }),
        t('modals.discardChanges.description', { defaultValue: 'Are you sure you want to discard your unsaved changes?' }),
        [
          { text: t('modals.discardChanges.cancel', { defaultValue: 'Keep Editing' }), style: 'cancel' },
          {
            text: t('modals.discardChanges.discard', { defaultValue: 'Discard Changes' }),
            style: 'destructive',
            onPress: () => {
              const init = initialDataRef.current;
              setName(init.name);
              setTimezone(init.timezone);
              setLanguage(init.language);
              setLocale(init.locale);
              setShowIcons(init.showIcons);
              setAvatarUri(init.avatarUri);
              setIsEditing(false);
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Name is required.');
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
        await authClient.updateUser({
          name: name.trim(),
          image: avatarUri || undefined,
        });
      } catch (_e) {
        // Silent fallback
      }

      initialDataRef.current = {
        name: name.trim(),
        timezone,
        language,
        locale,
        showIcons,
        avatarUri,
      };

      setContextShowIcons(showIcons);
      await utils.getUserPreferences.invalidate();
      setIsEditing(false);
      Alert.alert(t('common.success'), 'Profile updated successfully.');
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to update profile'
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
      email={session?.user?.email || ''}
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
