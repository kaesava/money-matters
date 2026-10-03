import { z } from "zod";

export const UpdateHouseholdFormSchema = z
  .object({
    name: z.string().trim().min(1, "Household name is required").max(100, "Name cannot exceed 100 characters"),
    currency: z.string().length(3).default("AUD"),
    timezone: z.string().min(1).default("Australia/Sydney"),
    country: z.string().length(2).default("AU"),
    state: z.string().max(100).nullable().optional(),
    postcode: z.string().max(20).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.country === "AU" && data.postcode && data.postcode.trim() !== "") {
        return /^\d{4}$/.test(data.postcode.trim());
      }
      return true;
    },
    {
      message: "Australian postcodes must be exactly 4 digits",
      path: ["postcode"],
    }
  );

export type UpdateHouseholdFormData = z.infer<typeof UpdateHouseholdFormSchema>;

export interface GovernanceWarning {
  key: string;
  params?: Record<string, string | number>;
}

export interface HouseholdMemberItem {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "OWNER" | "MEMBER";
  isOwner: boolean;
  inviteStatus: "PENDING" | "ACCEPTED" | "REVOKED";
  isPending: boolean;
}

export interface HouseholdGovernanceInfo {
  householdId: string;
  householdName: string;
  userRole: "OWNER" | "MEMBER";
  isOwner: boolean;
  isSoleOwner: boolean;
  memberCount: number;
  partnerEmail: string | null;
  country: string;
  currency: string;
  timezone: string;
  state: string | null;
  postcode: string | null;
  membersList: HouseholdMemberItem[];
  leaveWarning?: GovernanceWarning;
  deleteWarning?: GovernanceWarning | null;
}
