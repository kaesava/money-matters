import { bankAccountsProcedures } from './tenant/bank-accounts.procedures.js';
import { householdProcedures } from './tenant/household.procedures.js';
import { profileProcedures } from './tenant/profile.procedures.js';
import { tenantCoreProcedures } from './tenant/tenant-core.procedures.js';

export const tenantRouter = {
  ...bankAccountsProcedures,
  ...householdProcedures,
  ...profileProcedures,
  ...tenantCoreProcedures,
};
