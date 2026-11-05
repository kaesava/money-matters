import { paydayExecutionProcedures } from './payday/payday-execution.procedures.js';
import { paydayMatrixProcedures } from './payday/payday-matrix.procedures.js';

export const paydayRouter = {
  ...paydayExecutionProcedures,
  ...paydayMatrixProcedures,
};
