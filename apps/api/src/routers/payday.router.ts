import { paydayExecutionProcedures } from './payday/payday-execution.procedures.js';
import { paydayMatrixProcedures } from './payday/payday-matrix.procedures.js';
import { paydayStrategyProcedures } from './payday/payday-strategy.procedures.js';

export const paydayRouter = {
  ...paydayExecutionProcedures,
  ...paydayMatrixProcedures,
  ...paydayStrategyProcedures,
};
