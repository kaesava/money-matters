import { incomeSourcesProcedures } from './income/income-sources.procedures.js';
import { incomeEventsProcedures } from './income/income-events.procedures.js';
import { incomeLifecycleProcedures } from './income/income-lifecycle.procedures.js';

export const incomeRouter = {
  ...incomeSourcesProcedures,
  ...incomeEventsProcedures,
  ...incomeLifecycleProcedures,
};

