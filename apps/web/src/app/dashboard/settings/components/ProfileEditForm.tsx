"use client";

import Image from "next/image";
import React, { useRef } from "react";
import { t } from "@money-matters/i18n";
import { PhoneInput, Button } from "@money-matters/ui/web";
import { ProfilePreferencesFields } from "./ProfilePreferencesFields";

interface ProfileEditFormProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  loginEmail: string;
  notificationEmail: string;
  setNotificationEmail: (val: string) => void;
  phoneCountryCode: string;
  setPhoneCountryCode: (val: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  phoneError?: string;
  timezone: string;
  setTimezone: (val: string) => void;
  language: "en" | "ja";
  setLanguageState: (val: "en" | "ja") => void;
  locale: string;
  setLocale: (val: string) => void;
  showIcons: boolean;
  setShowIcons: (val: boolean) => void;
  avatarUrl: string;
  initials: string;
  isSaving: boolean;
  isDirty: boolean;
  onAvatarClick: () => void;
  onAvatarFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ProfileEditForm({
  displayName,
  setDisplayName,
  loginEmail,
  notificationEmail,
  setNotificationEmail,
  phoneCountryCode,
  setPhoneCountryCode,
  phoneNumber,
  setPhoneNumber,
  phoneError,
  timezone,
  setTimezone,
  language,
  setLanguageState,
  locale,
  setLocale,
  showIcons,
  setShowIcons,
  avatarUrl,
  initials,
  isSaving,
  isDirty,
  onAvatarClick,
  onAvatarFileSelected,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onSave} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
      {/* Header & Avatar Upload */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <button
                type="button"
                onClick={onAvatarClick}
                className="cursor-pointer group relative block rounded-full focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                title="Click to view / alter avatar"
              >
                <Image
                  unoptimized
                  src={avatarUrl}
                  alt={displayName}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#2563eb] shadow-xs group-hover:opacity-90 transition-opacity"
                />
              </button>
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#1B2B4B] flex items-center justify-center text-white text-lg font-extrabold shadow-xs">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
              title={t("settings.avatarUploadLabel")}
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={onAvatarFileSelected}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#1B2B4B]">{displayName || t("common.user")}</h2>
            <p className="text-xs text-slate-500">{loginEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            loading={isSaving}
            disabled={!isDirty || !displayName.trim() || !notificationEmail.trim()}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name (Mandatory) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-name" className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.displayNameLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-name"
            type="text"
            required
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("settings.displayNamePlaceholder")}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        {/* Login Email (Primary Auth - Read Only) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-login-email" className="text-xs font-bold text-slate-500">{t("settings.loginEmailLabel")}</label>
          <input
            id="edit-login-email"
            type="email"
            value={loginEmail}
            disabled
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Notification Email (Mandatory) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-notif-email" className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.notificationEmailLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-notif-email"
            type="email"
            required
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="alerts@example.com"
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <p className="text-[11px] text-slate-500">{t("settings.notificationEmailHint")}</p>
        </div>

        {/* Mobile Phone Number */}
        <div>
          <PhoneInput
            countryCode={phoneCountryCode}
            onCountryCodeChange={setPhoneCountryCode}
            phoneNumber={phoneNumber}
            onPhoneNumberChange={setPhoneNumber}
            label={t("settings.phoneNumberLabel")}
            error={phoneError}
          />
        </div>

        {/* Preferences: Language, Date format, Timezone, Show Icons */}
        <ProfilePreferencesFields
          language={language}
          setLanguageState={setLanguageState}
          locale={locale}
          setLocale={setLocale}
          timezone={timezone}
          setTimezone={setTimezone}
          showIcons={showIcons}
          setShowIcons={setShowIcons}
        />
      </div>

      <div className="pt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          loading={isSaving}
          disabled={!isDirty || !displayName.trim() || !notificationEmail.trim()}
        >
          {t("settings.saveProfileCta")}
        </Button>
      </div>
    </form>
  );
}
