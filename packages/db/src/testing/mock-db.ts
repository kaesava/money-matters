import type { DbOrTx } from "../types.js";

export interface MockDbOverrides {
  selectResult?: unknown[];
  insertResult?: unknown[];
  updateResult?: unknown[];
  deleteResult?: unknown[];
  executeResult?: unknown[];
}

export function createMockDb(overrides: MockDbOverrides = {}): DbOrTx {
  const chainable = (resolvedValue: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = [
      "from",
      "where",
      "innerJoin",
      "leftJoin",
      "rightJoin",
      "fullJoin",
      "orderBy",
      "groupBy",
      "having",
      "limit",
      "offset",
      "set",
      "values",
      "returning",
      "onConflictDoNothing",
      "onConflictDoUpdate",
    ];

    methods.forEach((method) => {
      chain[method] = (..._args: unknown[]) => chain;
    });

    chain.then = (resolve: (val: unknown) => void) => Promise.resolve(resolvedValue).then(resolve);
    chain.catch = (reject: (err: unknown) => void) => Promise.resolve(resolvedValue).catch(reject);

    return chain;
  };

  const mock = {
    select: (..._args: unknown[]) => chainable(overrides.selectResult ?? []),
    insert: (..._args: unknown[]) => chainable(overrides.insertResult ?? []),
    update: (..._args: unknown[]) => chainable(overrides.updateResult ?? []),
    delete: (..._args: unknown[]) => chainable(overrides.deleteResult ?? []),
    execute: async (..._args: unknown[]) => overrides.executeResult ?? [],
    transaction: async <T>(cb: (tx: DbOrTx) => Promise<T>): Promise<T> => cb(mock as unknown as DbOrTx),
    query: {},
  };

  return mock as unknown as DbOrTx;
}
