"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { ConfirmDialog } from "@money-matters/ui/web";
import { AvatarCropModal } from "../../../../components/web/AvatarCropModal";
import { ProfileReadOnlyView } from "./ProfileReadOnlyView";
import { ProfileEditForm } from "./ProfileEditForm";
import { useProfileForm } from "./useProfileForm";

interface ProfileSectionProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  currentTimezone: string;
}

export function ProfileSection({ user, currentTimezone }: ProfileSectionProps) {
  const form = useProfileForm({ user, currentTimezone });

  return (
    <>
      <AvatarCropModal
        isOpen={form.isCropperOpen}
        imageSrc={form.rawImageSrc}
        onClose={() => form.setIsCropperOpen(false)}
        onCropSave={(croppedUri) => form.setAvatarUrl(croppedUri)}
      />

      {form.isEditing ? (
        <ProfileEditForm
          displayName={form.displayName}
          setDisplayName={form.setDisplayName}
          loginEmail={user?.email || ""}
          notificationEmail={form.notificationEmail}
          setNotificationEmail={form.setNotificationEmail}
          phoneCountryCode={form.phoneCountryCode}
          setPhoneCountryCode={form.setPhoneCountryCode}
          phoneNumber={form.phoneNumber}
          setPhoneNumber={form.setPhoneNumber}
          phoneError={form.phoneError}
          timezone={form.timezone}
          setTimezone={form.setTimezone}
          language={form.language}
          setLanguageState={form.setLanguageState}
          locale={form.locale}
          setLocale={form.setLocale}
          showIcons={form.showIcons}
          setShowIcons={form.setShowIcons}
          avatarUrl={form.avatarUrl}
          initials={form.initials}
          isSaving={form.isSaving}
          isDirty={form.isDirty}
          onAvatarClick={() => {
            form.setRawImageSrc(form.avatarUrl);
            form.setIsCropperOpen(true);
          }}
          onAvatarFileSelected={form.handleAvatarFileSelected}
          onSave={form.handleSave}
          onCancel={form.handleCancel}
        />
      ) : (
        <ProfileReadOnlyView
          displayName={form.displayName}
          loginEmail={user?.email || ""}
          notificationEmail={form.notificationEmail}
          phoneCountryCode={form.phoneCountryCode}
          phoneNumber={form.phoneNumber}
          timezone={form.timezone}
          language={form.language}
          locale={form.locale}
          showIcons={form.showIcons}
          avatarUrl={form.avatarUrl}
          initials={form.initials}
          onEdit={() => form.setIsEditing(true)}
        />
      )}

      {form.showDiscardDialog && (
        <ConfirmDialog
          isOpen={form.showDiscardDialog}
          title={t("modals.discardChanges.title")}
          description={t("modals.discardChanges.description")}
          confirmLabel={t("modals.discardChanges.discard")}
          cancelLabel={t("modals.discardChanges.cancel")}
          variant="danger"
          onConfirm={form.handleDiscardConfirm}
          onClose={() => form.setShowDiscardDialog(false)}
        />
      )}
    </>
  );
}
