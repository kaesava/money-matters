"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useSubscriptionStatus } from "../../../../hooks/useSubscriptionStatus";
import { Spinner, InfoTooltip, useToast } from "@money-matters/ui/web";
import { ModalDialog } from "../../../../components/web/ModalDialog";

export function PartnerInviteSection() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Member removal state
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(null);
  const [confirmNameInput, setConfirmNameInput] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const { status } = useSubscriptionStatus();
  const isTrialExpired = status?.isTrialExpired ?? false;

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const inviteMutation = trpc.invitePartner.useMutation();
  const removeMemberMutation = trpc.removeHouseholdMember.useMutation();

  const gov = govQuery.data;
  const isOwner = gov?.isOwner ?? true;
  const membersList = gov?.membersList ?? [];

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    if (isTrialExpired) return;
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) {
      toast.warning("Please enter a valid email address.");
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      setInviteSuccessMsg(`Invite link created! Share URL: ${window.location.origin}/invite/${res.inviteToken}`);
      setPartnerEmail("");
      govQuery.refetch();
      toast.success("Household member invite generated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invite.");
    } finally {
      setPartnerInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    if (confirmNameInput.trim().toLowerCase() !== memberToRemove.name.trim().toLowerCase()) {
      toast.error(`Type exact member name (${memberToRemove.name}) to confirm.`);
      return;
    }

    setIsRemoving(true);
    try {
      await removeMemberMutation.mutateAsync({ targetUserId: memberToRemove.userId });
      toast.success(`Removed ${memberToRemove.name} from household.`);
      setMemberToRemove(null);
      setConfirmNameInput("");
      utils.getHouseholdGovernanceInfo.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN: Household Members List */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1B2B4B]">
              Household Members ({membersList.length})
            </h2>
            <InfoTooltip content="Active members with access to your household budget." />
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          People currently sharing access to your household budget.
        </p>

        <div className="space-y-3 pt-1">
          {membersList.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No members found.</p>
          ) : (
            membersList.map((m) => {
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
                  key={m.userId}
                  className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1B2B4B] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                        {initials}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1B2B4B]">{m.name}</span>
                        {m.isOwner ? (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#2563eb] rounded-md">
                            Owner
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md">
                            Member
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{m.email}</p>
                    </div>
                  </div>

                  {isOwner && !m.isOwner && m.userId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (m.userId) {
                          setMemberToRemove({ userId: m.userId, name: m.name });
                          setConfirmNameInput("");
                        }
                      }}
                      className="px-3 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Add a Household Member */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1B2B4B]">
              {t("settings.addMemberTitle")}
            </h2>
            <InfoTooltip content={t("settings.addMemberSubtitle")} />
          </div>
          {isTrialExpired && (
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 rounded-full">
              Trial Expired
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 font-medium">{t("settings.addMemberSubtitle")}</p>

        {!isOwner ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
            ℹ️ Only the household owner can invite new members.
          </div>
        ) : isTrialExpired ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>🔒 Household invitations require an active subscription ($9.95/mo).</span>
            <Link
              href="/subscription/upgrade"
              className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition-colors shrink-0"
            >
              Subscribe
            </Link>
          </div>
        ) : (
          <form onSubmit={handleInviteMember} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#1B2B4B]">Email Address</label>
              <input
                type="email"
                required
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="housemate@example.com"
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={partnerInviting}
                className="px-4 py-2 text-xs font-bold bg-[#1B2B4B] hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {partnerInviting && <Spinner size="sm" className="text-white" />}
                <span>Send Invitation →</span>
              </button>
            </div>
          </form>
        )}

        {inviteSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium break-all mt-2">
            {inviteSuccessMsg}
          </div>
        )}
      </section>

      {/* Owner Remove Member Confirmation Modal */}
      {memberToRemove && (
        <ModalDialog
          isOpen={Boolean(memberToRemove)}
          onClose={() => setMemberToRemove(null)}
          title={t("settings.removeMemberTitle")}
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to remove <strong>{memberToRemove.name}</strong> from your household? They will lose access to shared budget pools.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#1B2B4B]">
                {t("settings.removeMemberConfirm", { name: memberToRemove.name })}
              </label>
              <input
                type="text"
                value={confirmNameInput}
                onChange={(e) => setConfirmNameInput(e.target.value)}
                placeholder={memberToRemove.name}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isRemoving || confirmNameInput.trim().toLowerCase() !== memberToRemove.name.trim().toLowerCase()}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isRemoving && <Spinner size="sm" className="text-white" />}
                <span>Remove Member</span>
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
