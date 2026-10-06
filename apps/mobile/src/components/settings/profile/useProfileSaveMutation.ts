import { useState } from 'react';
import { useMobileToast, validateMobileNumber, useIconVisibility } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';

interface SaveProfileParams {
  name: string;
  notificationEmail: string;
  phoneCountryCode: string;
  phoneNumber: string;
  avatarUri: string | null;
  timezone: string;
  language: 'en';
  locale: string;
  showIcons: boolean;
  onSuccess: () => void;
  setPhoneError: (err: string | undefined) => void;
}

export function useProfileSaveMutation() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { setShowIcons: setContextShowIcons } = useIconVisibility();
  const [saving, setSaving] = useState(false);

  const updatePrefMut = trpc.updateUserPreferences.useMutation();
  const updateProfileMut = trpc.updateUserProfile.useMutation();

  const handleSave = async ({
    name,
    notificationEmail,
    phoneCountryCode,
    phoneNumber,
    avatarUri,
    timezone,
    language,
    locale,
    showIcons,
    onSuccess,
    setPhoneError,
  }: SaveProfileParams) => {
    if (!name.trim()) {
      toast.error(t('settings.displayNameRequired'), t('common.error'));
      return;
    }
    if (!notificationEmail.trim()) {
      toast.error(t('settings.members.invalidEmailWarning'), t('common.error'));
      return;
    }

    const phoneCheck = validateMobileNumber(phoneCountryCode, phoneNumber);
    if (!phoneCheck.isValid) {
      setPhoneError(phoneCheck.errorMessage);
      toast.error(phoneCheck.errorMessage || t('settings.profile.phoneInvalid'));
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
      } catch {
        // Silent fallback
      }

      setContextShowIcons(showIcons);
      await Promise.all([
        utils.getUserPreferences.invalidate(),
        utils.getUserProfile.invalidate(),
      ]);
      onSuccess();
      toast.success(t('toasts.saved'), t('common.success'));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('settings.profile.profileSaveFailed'),
        t('common.error')
      );
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleSave };
}
