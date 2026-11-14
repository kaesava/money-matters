import type { TranslationKey } from "./index";

export const ASSISTANT_UNAVAILABLE_KEYS: Record<string, TranslationKey> = {
  quota_exceeded: "assistant.unavailable.quota_exceeded",
  read_only_grace: "assistant.unavailable.read_only_grace",
  subscription_required: "assistant.unavailable.subscription_required",
  disabled: "assistant.unavailable.disabled",
  rate_limited: "assistant.unavailable.rate_limited",
  service_error: "assistant.unavailable.service_error",
  unauthenticated: "assistant.unavailable.unauthenticated",
};

export const ARCHIVED_ITEM_TYPE_KEYS: Record<string, TranslationKey> = {
  ENVELOPE: "settings.archived.types.ENVELOPE",
  INCOME_SOURCE: "settings.archived.types.INCOME_SOURCE",
  BANK_ACCOUNT: "settings.archived.types.BANK_ACCOUNT",
};

export const ALLOCATION_STEP_TYPE_KEYS: Record<string, TranslationKey> = {
  IMMEDIATE_BILLS: "settings.paydayRules.stepTypes.IMMEDIATE_BILLS",
  DEFICIT_REPAIR: "settings.paydayRules.stepTypes.DEFICIT_REPAIR",
  BILLS_SAFETY_FLOOR: "settings.paydayRules.stepTypes.BILLS_SAFETY_FLOOR",
  PRO_RATA_BILLS: "settings.paydayRules.stepTypes.PRO_RATA_BILLS",
  EVERYDAY_ALLOWANCE: "settings.paydayRules.stepTypes.EVERYDAY_ALLOWANCE",
  PRIORITY_BILLS: "settings.paydayRules.stepTypes.PRIORITY_BILLS",
  STANDARD_BILLS: "settings.paydayRules.stepTypes.STANDARD_BILLS",
  PRIORITY_GOALS: "settings.paydayRules.stepTypes.PRIORITY_GOALS",
  STANDARD_GOALS: "settings.paydayRules.stepTypes.STANDARD_GOALS",
  FIXED_AMOUNT: "settings.paydayRules.stepTypes.FIXED_AMOUNT",
  PERCENTAGE_SPLIT: "settings.paydayRules.stepTypes.PERCENTAGE_SPLIT",
  SURPLUS_SWEEP: "settings.paydayRules.stepTypes.SURPLUS_SWEEP",
};

export const ALLOCATION_STEP_DESC_KEYS: Record<string, TranslationKey> = {
  IMMEDIATE_BILLS: "settings.paydayRules.stepDescriptions.IMMEDIATE_BILLS",
  DEFICIT_REPAIR: "settings.paydayRules.stepDescriptions.DEFICIT_REPAIR",
  BILLS_SAFETY_FLOOR: "settings.paydayRules.stepDescriptions.BILLS_SAFETY_FLOOR",
  PRO_RATA_BILLS: "settings.paydayRules.stepDescriptions.PRO_RATA_BILLS",
  EVERYDAY_ALLOWANCE: "settings.paydayRules.stepDescriptions.EVERYDAY_ALLOWANCE",
  PRIORITY_BILLS: "settings.paydayRules.stepDescriptions.PRIORITY_BILLS",
  STANDARD_BILLS: "settings.paydayRules.stepDescriptions.STANDARD_BILLS",
  PRIORITY_GOALS: "settings.paydayRules.stepDescriptions.PRIORITY_GOALS",
  STANDARD_GOALS: "settings.paydayRules.stepDescriptions.STANDARD_GOALS",
  FIXED_AMOUNT: "settings.paydayRules.stepDescriptions.FIXED_AMOUNT",
  PERCENTAGE_SPLIT: "settings.paydayRules.stepDescriptions.PERCENTAGE_SPLIT",
  SURPLUS_SWEEP: "settings.paydayRules.stepDescriptions.SURPLUS_SWEEP",
};

export const BANK_ACCOUNT_TYPE_KEYS: Record<string, TranslationKey> = {
  EVERYDAY: "bankAccounts.accountTypes.EVERYDAY",
  SAVINGS: "bankAccounts.accountTypes.SAVINGS",
  CREDIT_CARD: "bankAccounts.accountTypes.CREDIT_CARD",
  LOAN_OFFSET: "bankAccounts.accountTypes.LOAN_OFFSET",
};
