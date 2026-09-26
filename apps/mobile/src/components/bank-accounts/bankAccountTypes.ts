export interface BankAccountItemToEdit {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  isPrivate?: boolean;
}

export type SupportedBankProvider = 'CBA' | 'Westpac' | 'ANZ' | 'NAB' | 'ING' | 'Macquarie' | 'Other';

export const PROVIDERS: SupportedBankProvider[] = [
  'CBA',
  'Westpac',
  'ANZ',
  'NAB',
  'ING',
  'Macquarie',
  'Other',
];
