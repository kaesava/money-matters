import React, { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  useIconVisibility,
  useMobileToast,
  showMobileConfirm,
  validateMobileNumber,
} from '@money-matters/ui/mobile';
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

interface MobileProfileSectionProps {
  onDirtyChange?: (isDirty: boolean) => void;
  registerDiscard?: (discardFn: () => void) => void;
}

export function MobileProfileSection({
  onDirtyChange,
  registerDiscard,
}: MobileProfileSectionProps = {}) {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const toast = useMobileToast();
  const { setShowIcons: setContextShowIcons } = useIconVisibility();

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

    checkBiometricsAvailable().then(setBiometricsAvailable).catch(() => {});
    getBiometricTypeLabel().then(setBiometricLabel).catch(() => {});
    isBiometricLockEnabled().then(setBiometricsEnabled).catch(() => {});
  }, [userProfileQuery.data, userPrefQuery.data, session, storedEmail]);

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

  const handleDiscard = React.useCallback(() => {
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

  const handleToggleBiometrics = async () => {
    const nextState = !biometricsEnabled;
    if (nextState) {
      const authenticated = await authenticateWithBiometrics(
        'Enable biometric security for Money Matters'
      );
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
  const updateProfileMut = trpc.updateUserProfile.useMutation();

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
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        toast.error('Avatar image must be under 2MB.');
        return;
      }
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
        onConfirm: handleDiscard,
      });
    } else {
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required.', t('common.error'));
      return;
    }
    if (!notificationEmail.trim()) {
      toast.error('Notification email is required.', t('common.error'));
      return;
    }

    const phoneCheck = validateMobileNumber(phoneCountryCode, phoneNumber);
    if (!phoneCheck.isValid) {
      setPhoneError(phoneCheck.errorMessage);
      toast.error(phoneCheck.errorMessage || 'Invalid phone number');
      return;
    }
    setPhoneError(undefined);

    setSaving(true);
    try {
      await updatePrefMut.mutateAsync({
        timezone,
        language,
        locale,
        showIcons,
      });

      await updateProfileMut.mutateAsync({
        displayName: name.trim(),
        notificationEmail: notificationEmail.trim(),
        phoneCountryCode,
        phoneNumber: phoneNumber.trim(),
        avatarUrl: avatarUri || undefined,
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
        notificationEmail: notificationEmail.trim(),
        phoneCountryCode,
        phoneNumber: phoneNumber.trim(),
        timezone,
        language,
        locale,
        showIcons,
        avatarUri,
      };

      setContextShowIcons(showIcons);
      await Promise.all([
        utils.getUserPreferences.invalidate(),
        utils.getUserProfile.invalidate(),
      ]);
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
        phoneError={phoneError}
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
