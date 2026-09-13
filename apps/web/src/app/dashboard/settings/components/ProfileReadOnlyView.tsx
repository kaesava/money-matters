"use client";

import Image from "next/image";
import React from "react";
import { t } from "@money-matters/i18n";
import { Button, InfoTooltip } from "@money-matters/ui/web";
import { SUPPORTED_LOCALES } from "@money-matters/types";

interface ProfileReadOnlyViewProps {
  displayName: string;
  loginEmail: string;
  notificationEmail: string;
  phoneCountryCode: string;
  phoneNumber: string;
  timezone: string;
  language: "en" | "ja";
  locale: string;
  showIcons: boolean;
  avatarUrl: string;
  initials: string;
  onEdit: () => void;
}

export function ProfileReadOnlyView({
  displayName,
  loginEmail,
  notificationEmail,
  phoneCountryCode,
  phoneNumber,
  timezone,
  language,
  locale,
  showIcons,
  avatarUrl,
  initials,
  onEdit,
}: ProfileReadOnlyViewProps) {
  const selectedLocaleOption =
    SUPPORTED_LOCALES.find((l) => l.code === locale) ||
    SUPPORTED_LOCALES.find((l) => l.code === "auto");

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
      {/* Header & Avatar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <Image
                unoptimized
                src={avatarUrl}
                alt={displayName}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#2563eb] shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#1B2B4B] flex items-center justify-center text-white text-lg font-extrabold shadow-xs">
                {initials}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#1B2B4B]">
                {displayName || t("common.user")}
              </h2>
            </div>
            <p className="text-xs text-slate-500">{loginEmail}</p>
          </div>
        </div>

        <Button variant="secondary" onClick={onEdit} className="shrink-0">
          ✏️ {t("common.edit")}
        </Button>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.displayNameLabel")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {displayName || "—"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.loginEmailLabel")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {loginEmail || "—"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.notificationEmailLabel")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {notificationEmail || "—"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.phoneNumberLabel")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {phoneNumber ? `${phoneCountryCode} ${phoneNumber}` : "—"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.language")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {language === "ja" ? "日本語 (ja)" : "English (en)"}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.dateFormat")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {selectedLocaleOption
              ? `${selectedLocaleOption.label} (${selectedLocaleOption.dateFormatExample})`
              : locale}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("settings.items.timezone")}
          </span>
          <span className="text-xs font-semibold text-[#1B2B4B] font-mono">
            {timezone}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t("settings.items.showIcons")}
            </span>
            <InfoTooltip
              title={t("settings.items.showIcons")}
              content={t("settings.items.showIconsHint")}
            />
          </div>
          <span className="text-xs font-semibold text-[#1B2B4B]">
            {showIcons ? "✓ Visible" : "✕ Hidden"}
          </span>
        </div>
      </div>
    </div>
  );
}
