"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { useSubscriptionStatus } from "../../../../hooks/useSubscriptionStatus";
import { useToast } from "@money-matters/ui/web";
import { TypedConfirmDialog } from "@money-matters/ui/web";
import { MembersList, type HouseholdMemberItem } from "./MembersList";
import { InviteMemberCard } from "./InviteMemberCard";

export function PartnerInviteSection() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerInviting, setPartnerInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const [memberToRemove, setMemberToRemove] = useState<HouseholdMemberItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const { status } = useSubscriptionStatus();
  const isTrialExpired = status?.isTrialExpired ?? false;

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const inviteMutation = trpc.invitePartner.useMutation();
  const removeMemberMutation = trpc.removeHouseholdMember.useMutation();

  const gov = govQuery.data;
  const isOwner = gov?.isOwner ?? true;
  const membersList = (gov?.membersList ?? []) as HouseholdMemberItem[];

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    if (isTrialExpired) return;
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) {
      toast.warning(t("settings.members.invalidEmailWarning"));
      return;
    }
    setPartnerInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await inviteMutation.mutateAsync({ email: partnerEmail.trim() });
      setInviteSuccessMsg(`✉️ ${t("settings.members.inviteSentSuccess", { email: res.email })}`);
      setPartnerEmail("");
      govQuery.refetch();
      toast.success(t("settings.members.inviteSentSuccess", { email: res.email }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.members.inviteFailed"));
    } finally {
      setPartnerInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await removeMemberMutation.mutateAsync({
        memberId: memberToRemove.id,
        targetUserId: memberToRemove.userId || undefined,
      });
      toast.success(t("settings.members.removeMemberSuccess", { name: memberToRemove.name }));
      setMemberToRemove(null);
      utils.getHouseholdGovernanceInfo.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.members.removeMemberFailed"));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MembersList
        members={membersList}
        isOwner={isOwner}
        onInitiateRemove={(m) => setMemberToRemove(m)}
      />

      <InviteMemberCard
        isOwner={isOwner}
        isTrialExpired={isTrialExpired}
        partnerEmail={partnerEmail}
        setPartnerEmail={setPartnerEmail}
        partnerInviting={partnerInviting}
        onInviteMember={handleInviteMember}
        inviteSuccessMsg={inviteSuccessMsg}
      />

      <TypedConfirmDialog
        isOpen={Boolean(memberToRemove)}
        title={t("settings.removeMemberTitle")}
        subtitle={memberToRemove ? t("settings.removeMemberConfirm", { name: memberToRemove.name }) : ""}
        confirmPhrase={memberToRemove?.name || ""}
        confirmLabel={t("settings.typeToConfirmLabel", { phrase: memberToRemove?.name || "" })}
        confirmButtonText={t("settings.members.removeAction")}
        isLoading={isRemoving}
        onConfirm={handleRemoveMember}
        onClose={() => setMemberToRemove(null)}
      />
    </div>
  );
}
