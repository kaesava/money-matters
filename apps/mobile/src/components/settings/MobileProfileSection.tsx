import React from 'react';
import { MobileProfileReadOnlyView } from './MobileProfileReadOnlyView';
import { MobileProfileEditView } from './MobileProfileEditView';
import { useMobileProfileData } from './profile/useMobileProfileData';

interface MobileProfileSectionProps {
  onDirtyChange?: (isDirty: boolean) => void;
  registerDiscard?: (discardFn: () => void) => void;
}

export function MobileProfileSection({
  onDirtyChange,
  registerDiscard,
}: MobileProfileSectionProps = {}) {
  const data = useMobileProfileData({
    onDirtyChange,
    registerDiscard,
  });

  if (data.isEditing) {
    return (
      <MobileProfileEditView
        name={data.name}
        setName={data.setName}
        loginEmail={data.storedEmail}
        notificationEmail={data.notificationEmail}
        setNotificationEmail={data.setNotificationEmail}
        phoneCountryCode={data.phoneCountryCode}
        setPhoneCountryCode={data.setPhoneCountryCode}
        phoneNumber={data.phoneNumber}
        setPhoneNumber={data.setPhoneNumber}
        phoneError={data.phoneError}
        avatarUri={data.avatarUri}
        onPickAvatar={data.handlePickAvatar}
        timezone={data.timezone}
        setTimezone={data.setTimezone}
        language={data.language}
        setLanguage={data.setLanguage}
        locale={data.locale}
        setLocale={data.setLocale}
        showIcons={data.showIcons}
        setShowIcons={data.setShowIcons}
        saving={data.saving}
        onSave={data.handleSave}
        onCancel={data.handleCancel}
      />
    );
  }

  return (
    <MobileProfileReadOnlyView
      name={data.name}
      email={data.storedEmail}
      notificationEmail={data.notificationEmail}
      phoneCountryCode={data.phoneCountryCode}
      phoneNumber={data.phoneNumber}
      avatarUri={data.avatarUri}
      timezone={data.timezone}
      language={data.language}
      locale={data.locale}
      showIcons={data.showIcons}
      biometricsAvailable={data.biometricsAvailable}
      biometricsEnabled={data.biometricsEnabled}
      biometricLabel={data.biometricLabel}
      onToggleBiometrics={data.handleToggleBiometrics}
      onEdit={() => data.setIsEditing(true)}
    />
  );
}
