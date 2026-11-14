import { describe, it, expect, vi, beforeEach } from "vitest";
import { markExpensePaidCommand } from "./mark-expense-paid.command.js";
import type { DbOrTx } from "@money-matters/db";
import { expenseEvents, envelopes, transactionLedger } from "@money-matters/db";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@money-matters/db")>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn().mockResolvedValue({
      "11111111-1111-1111-1111-111111111111": 200,
      "22222222-2222-2222-2222-222222222222": 50,
    }),
  };
});

describe("markExpensePaidCommand", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";
  const otherUserId = "00000000-0000-0000-0000-000000000004";
  const srcEnvId = "11111111-1111-1111-1111-111111111111";
  const dstEnvId = "22222222-2222-2222-2222-222222222222";
  const eventId = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeMockDb = (opts: {
    eventRow?: Record<string, unknown> | null;
    updateReturning?: Record<string, unknown>[];
    envelopeRows?: Record<string, unknown>[];
  }) => {
    const insertedTables: unknown[] = [];
    const mockDb: Record<string, unknown> = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => {
          const rows =
            table === expenseEvents
              ? opts.eventRow
                ? [opts.eventRow]
                : []
              : table === envelopes
                ? opts.envelopeRows || []
                : table === transactionLedger
                  ? [{ amount: "100.00", flowType: "CREDIT" }]
                  : [{ id: "bank-1", lastKnownBalance: "500.00" }];
          const p: Promise<unknown> & { limit?: ReturnType<typeof vi.fn> } = Promise.resolve(rows);
          p.limit = vi.fn().mockResolvedValue(rows);
          const queryChain: Record<string, unknown> = {
            leftJoin: vi.fn().mockImplementation(() => queryChain),
            where: vi.fn().mockReturnValue(p),
          };
          return queryChain;
        }),
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(opts.updateReturning ?? [{ id: eventId }]),
          }),
        }),
      })),
      insert: vi.fn().mockImplementation((table: unknown) => {
        insertedTables.push(table);
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "tx-1" }]),
          }),
        };
      }),
    };
    return { db: mockDb as unknown as DbOrTx, insertedTables };
  };

  it("throws NOT_FOUND if expense event does not exist", async () => {
    const { db } = makeMockDb({ eventRow: null });
    await expect(
      markExpensePaidCommand(
        { eventId, amount: "100.00", date: "2026-11-14" },
        tenantId,
        appId,
        userId,
        db
      )
    ).rejects.toThrow("Expense event not found.");
  });

  it("rejects already confirmed events via optimistic lock", async () => {
    const { db } = makeMockDb({
      eventRow: { id: eventId, envelopeId: dstEnvId, status: "PENDING", name: "Power" },
      updateReturning: [],
    });
    await expect(
      markExpensePaidCommand(
        { eventId, amount: "100.00", date: "2026-11-14" },
        tenantId,
        appId,
        userId,
        db
      )
    ).rejects.toThrow("Expense event has already been paid or updated.");
  });

  it("rejects self-transfer in shortfallTransfers", async () => {
    const { db } = makeMockDb({
      eventRow: { id: eventId, envelopeId: dstEnvId, status: "PENDING", name: "Power" },
    });
    await expect(
      markExpensePaidCommand(
        {
          eventId,
          amount: "100.00",
          date: "2026-11-14",
          shortfallTransfers: [{ sourceEnvelopeId: dstEnvId, amount: "50.00" }],
        },
        tenantId,
        appId,
        userId,
        db
      )
    ).rejects.toThrow("Cannot transfer shortfall from the destination envelope itself.");
  });

  it("rejects private source envelope owned by another user", async () => {
    const { db } = makeMockDb({
      eventRow: { id: eventId, envelopeId: dstEnvId, status: "PENDING", name: "Power" },
      envelopeRows: [
        { id: srcEnvId, name: "Secret", isPrivate: true, userId: otherUserId, bankAccountId: "bank-1", bankAccountIsPrivate: false, bankAccountUserId: userId },
      ],
    });
    await expect(
      markExpensePaidCommand(
        {
          eventId,
          amount: "100.00",
          date: "2026-11-14",
          shortfallTransfers: [{ sourceEnvelopeId: srcEnvId, amount: "50.00" }],
        },
        tenantId,
        appId,
        userId,
        db
      )
    ).rejects.toThrow("Source envelope invalid or access unauthorized.");
  });

  it("executes shortfall transfers and expense recording atomically inside one transaction", async () => {
    const { db, insertedTables } = makeMockDb({
      eventRow: {
        id: eventId,
        envelopeId: dstEnvId,
        envelopeName: "Power",
        bankAccountId: "bank-1",
        status: "PENDING",
        name: "Power",
      },
      envelopeRows: [
        { id: srcEnvId, name: "Everyday", isPrivate: false, userId, bankAccountId: "bank-1", bankAccountIsPrivate: false, bankAccountUserId: userId },
      ],
    });

    const res = await markExpensePaidCommand(
      {
        eventId,
        amount: "100.00",
        date: "2026-11-14",
        note: "Power bill",
        shortfallTransfers: [{ sourceEnvelopeId: srcEnvId, amount: "50.00" }],
      },
      tenantId,
      appId,
      userId,
      db
    );

    expect(res.success).toBe(true);
    expect((db as unknown as { transaction: ReturnType<typeof vi.fn> }).transaction).toHaveBeenCalled();
    expect(insertedTables.filter((t) => t === transactionLedger).length).toBeGreaterThanOrEqual(2);
  });
});
