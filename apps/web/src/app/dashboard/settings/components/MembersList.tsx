"use client";

import Image from "next/image";
import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";

export interface HouseholdMemberItem {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isOwner?: boolean;
  isPending?: boolean;
  inviteStatus?: string | null;
}

interface MembersListProps {
  members: HouseholdMemberItem[];
  isOwner: boolean;
  onInitiateRemove: (member: HouseholdMemberItem) => void;
}

export function MembersList({ members, isOwner, onInitiateRemove }: MembersListProps) {
  return (
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-[#1B2B4B]">
          {t("settings.members.title")}
        </h2>
        <InfoTooltip content={t("settings.members.tooltip")} />
      </div>

      <div className="space-y-3 pt-1">
        {members.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">{t("settings.members.noMembers")}</p>
        ) : (
          members.map((m) => {
            const initials = m.name
              ? m.name
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "?";

            return (
              <div
                key={m.id || m.userId || m.email}
                className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {m.avatarUrl ? (
                    <Image
                      src={m.avatarUrl}
                      alt={m.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1B2B4B] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#1B2B4B]">{m.name}</span>
                      {m.isOwner ? (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#2563eb] rounded-md">
                          {t("settings.members.roleOwner")}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md">
                          {t("settings.members.roleMember")}
                        </span>
                      )}
                      {(m.isPending || m.inviteStatus === "PENDING") && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 rounded-md">
                          ⌛ {t("partner.pendingAcceptance")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{m.email}</p>
                  </div>
                </div>

                {isOwner && !m.isOwner && (
                  <button
                    type="button"
                    onClick={() => onInitiateRemove(m)}
                    className="px-3 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    {t("settings.members.removeAction")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
