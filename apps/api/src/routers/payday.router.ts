import { paydayExecutionProcedures } from './payday/payday-execution.procedures.js';
import { paydayHorizonProcedures } from './payday/payday-horizon.procedures.js';
import { paydayStrategyProcedures } from './payday/payday-strategy.procedures.js';

export const paydayRouter = {
  ...paydayExecutionProcedures,
  ...paydayHorizonProcedures,
  ...paydayStrategyProcedures,
};
