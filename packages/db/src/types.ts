import type { db } from "./index.js";

export type DbClient = typeof db;
export type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type DbOrTx = DbClient | DbTransaction;
