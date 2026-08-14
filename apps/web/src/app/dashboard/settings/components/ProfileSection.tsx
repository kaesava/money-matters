"use client";

import React from "react";
import { t } from "@money-matters/i18n";

interface ProfileSectionProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export function ProfileSection({ user }: ProfileSectionProps) {
  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dash-muted)" }}>
        {t("settings.profile", { defaultValue: "Profile" })}
      </p>
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{ backgroundColor: "var(--dash-surface)", border: "1px solid var(--dash-border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
          style={{ backgroundColor: "var(--dash-teal)" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--dash-text)" }}>
            {user.name}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--dash-muted)" }}>
            {user.email}
          </p>
        </div>
      </div>
    </section>
  );
}
