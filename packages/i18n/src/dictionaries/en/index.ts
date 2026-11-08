import { common } from './common';
import { auth } from './auth';
import { dashboard } from './dashboard';
import { envelopes } from './envelopes';
import { payday } from './payday';
import { incomeBills } from './incomeBills';
import { transactions } from './transactions';
import { settings } from './settings';
import { privacy } from './privacy';
import { feedback } from './feedback';
import { setup } from './setup';
import { landing } from './landing';
import { tour } from './tour';
import { commandPalette } from './commandPalette';
import { fileNotes } from './fileNotes';
import { reports } from './reports';

export const en = {
  ...common,
  ...auth,
  ...dashboard,
  ...envelopes,
  ...payday,
  ...incomeBills,
  ...transactions,
  ...settings,
  ...privacy,
  ...feedback,
  ...setup,
  ...landing,
  ...tour,
  ...commandPalette,
  ...fileNotes,
  ...reports,
} as const;

export type TranslationDictionary = typeof en;
