import { z } from "zod";

export const BANK_PROVIDERS = [
  "CBA",
  "NAB",
  "ANZ",
  "Westpac",
  "ING",
  "Macquarie",
  "Other",
] as const;

export type BankProvider = (typeof BANK_PROVIDERS)[number];

export const ACCOUNT_TYPES = [
  "EVERYDAY",
  "SAVINGS",
  "LOAN_OFFSET",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  EVERYDAY: "Everyday",
  SAVINGS: "Savings",
  LOAN_OFFSET: "Loan Offset",
};

export const BANK_PROVIDER_LABELS: Record<BankProvider, string> = {
  CBA: "Commonwealth Bank",
  NAB: "National Australia Bank",
  ANZ: "ANZ Bank",
  Westpac: "Westpac",
  ING: "ING Australia",
  Macquarie: "Macquarie Bank",
  Other: "Other Financial Institution",
};

export function getDefaultAccountName(provider?: BankProvider | null, type?: AccountType | null): string {
  const pLabel = provider ? (BANK_PROVIDER_LABELS[provider] || provider) : "Other Financial Institution";
  if (!type) return pLabel;
  const tLabel = ACCOUNT_TYPE_LABELS[type] || "Everyday";
  return `${pLabel} (${tLabel})`;
}

const moneyRegex = /^\d{1,12}(\.\d{1,2})?$/;

export const BankAccountFormSchema = z
  .object({
    name: z.string().trim().min(1, "Account name is required").max(100, "Account name cannot exceed 100 characters"),
    bankProvider: z.enum(BANK_PROVIDERS).default("Other"),
    accountType: z.enum(ACCOUNT_TYPES).default("EVERYDAY"),
    currentBalance: z
      .string()
      .trim()
      .regex(moneyRegex, "Balance must be a valid non-negative amount"),
    unbudgetedBuffer: z
      .string()
      .trim()
      .regex(moneyRegex, "Buffer must be a valid non-negative amount")
      .default("0.00"),
    isPrivate: z.boolean().default(false),
  })
  .strict()
  .refine(
    (data) => {
      const bal = parseFloat(data.currentBalance || "0");
      const buf = parseFloat(data.unbudgetedBuffer || "0");
      return buf <= bal;
    },
    {
      message: "Unbudgeted buffer cannot exceed current balance",
      path: ["unbudgetedBuffer"],
    }
  );

export type BankAccountFormData = z.infer<typeof BankAccountFormSchema>;

export function computeAccountAvailability(
  currentBalanceStr: string | number | null | undefined,
  unbudgetedBufferStr: string | number | null | undefined
): {
  actualBalance: number;
  buffer: number;
  available: number;
} {
  const actualBalance = typeof currentBalanceStr === "number"
    ? currentBalanceStr
    : parseFloat(currentBalanceStr || "0") || 0;
  const buffer = typeof unbudgetedBufferStr === "number"
    ? unbudgetedBufferStr
    : parseFloat(unbudgetedBufferStr || "0") || 0;
  const available = Math.max(0, Math.round((actualBalance - buffer) * 100) / 100);

  return {
    actualBalance,
    buffer,
    available,
  };
}
