import { describe, it, expect, vi } from "vitest";
import { createEnvelopeCommand } from "./create-envelope.command.js";
import { updateEnvelopeCommand } from "./update-envelope.command.js";
import { overrideEventCommand } from "./override-event.command.js";
import { maintainRollingWindowCommand } from "./maintain-rolling-window.command.js";
import { restoreItemCommand } from "./restore-item.command.js";
import { envelopes, expenseEvents, incomeSources, tenants } from "@money-matters/db";
import type { DbOrTx } from "@money-matters/db";

describe("Envelope Lifecycle & Event Sync", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  it("createEnvelopeCommand bursts 12 months when generateEvents is true", async () => {
    let insertedEvents: Record<string, unknown>[] = [];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "bank-1", isPrivate: false, userId: null },
          ]),
        }),
      }),
      insert: vi.fn().mockImplementation((table: unknown) => ({
        values: vi.fn().mockImplementation((vals: unknown) => {
          if (table === expenseEvents) {
            insertedEvents = Array.isArray(vals) ? vals : [vals];
          }
          return {
            returning: vi.fn().mockResolvedValue([
              { id: "env-1", name: "Gym Membership", envelopeType: "BILL", fundingMode: "RECURRING", generateEvents: true },
            ]),
          };
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      transaction: vi.fn().mockImplementation((cb: (tx: DbOrTx) => unknown) => cb(mockDb as unknown as DbOrTx)),
    } as unknown as DbOrTx;

    await createEnvelopeCommand(
      {
        name: "Gym Membership",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        bankAccountId: "bank-1",
        enteredAmount: "50.00",
        budgetFrequency: "MONTHLY",
        generateEvents: true,
      },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    expect(insertedEvents.length).toBe(12);
  });

  it("createEnvelopeCommand does NOT burst events when generateEvents is false", async () => {
    let insertedEvents: Record<string, unknown>[] = [];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "bank-1", isPrivate: false, userId: null },
          ]),
        }),
      }),
      insert: vi.fn().mockImplementation((table: unknown) => ({
        values: vi.fn().mockImplementation((vals: unknown) => {
          if (table === expenseEvents) {
            insertedEvents = Array.isArray(vals) ? vals : [vals];
          }
          return {
            returning: vi.fn().mockResolvedValue([
              { id: "env-2", name: "Spotify", envelopeType: "BILL", fundingMode: "RECURRING", generateEvents: false },
            ]),
          };
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      transaction: vi.fn().mockImplementation((cb: (tx: DbOrTx) => unknown) => cb(mockDb as unknown as DbOrTx)),
    } as unknown as DbOrTx;

    await createEnvelopeCommand(
      {
        name: "Spotify",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        bankAccountId: "bank-1",
        enteredAmount: "15.00",
        budgetFrequency: "MONTHLY",
        generateEvents: false,
      },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    expect(insertedEvents.length).toBe(0);
  });

  it("updateEnvelopeCommand clears pending events when converted to TARGET_BALANCE fundingMode", async () => {
    let deletedEvents = false;
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "env-1",
              name: "Power",
              envelopeType: "BILL",
              fundingMode: "RECURRING",
              isPrivate: false,
              generateEvents: true,
            },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: "env-1", name: "Power", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", generateEvents: true },
            ]),
          }),
        }),
      }),
      delete: vi.fn().mockImplementation((table: unknown) => ({
        where: vi.fn().mockImplementation(() => {
          if (table === expenseEvents) deletedEvents = true;
          return Promise.resolve();
        }),
      })),
      transaction: vi.fn().mockImplementation((cb: (tx: DbOrTx) => unknown) => cb(mockDb as unknown as DbOrTx)),
    } as unknown as DbOrTx;

    await updateEnvelopeCommand(
      "env-1",
      {
        fundingMode: "TARGET_BALANCE",
      },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    expect(deletedEvents).toBe(true);
  });

  it("overrideEventCommand recalculates monthlyAmount respecting budgetFrequency when updateSeries is true", async () => {
    let updatedEnvelopePayload = null as Record<string, unknown> | null;
    let updatedSubsequentEvents: unknown = null;

    const mockDb = {
      update: vi.fn().mockImplementation((table: unknown) => ({
        set: vi.fn().mockImplementation((payload: unknown) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === expenseEvents) {
              if (!updatedSubsequentEvents) {
                return {
                  returning: vi.fn().mockResolvedValue([
                    {
                      id: "evt-1",
                      envelopeId: "env-fortnightly",
                      expectedDate: "2026-11-01",
                      expectedAmount: "100.00",
                      status: "PENDING",
                    },
                  ]),
                };
              } else {
                updatedSubsequentEvents = payload;
                return Promise.resolve();
              }
            }
            if (table === envelopes) {
              updatedEnvelopePayload = payload as Record<string, unknown>;
              return Promise.resolve();
            }
            return Promise.resolve();
          }),
        })),
      })),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "env-fortnightly", budgetFrequency: "FORTNIGHTLY" },
          ]),
        }),
      }),
    };
    (mockDb as unknown as Record<string, unknown>).transaction = vi.fn().mockImplementation((cb: (tx: DbOrTx) => unknown) => cb(mockDb as unknown as DbOrTx));

    await overrideEventCommand(
      {
        eventId: "evt-1",
        eventType: "EXPENSE",
        expectedAmount: "100.00",
        updateSeries: true,
      },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    // For fortnightly: (100 * 26) / 12 = 216.67
    expect(updatedEnvelopePayload).toBeDefined();
    expect(updatedEnvelopePayload?.monthlyAmount).toBe("216.67");
    expect(updatedEnvelopePayload?.enteredAmount).toBe("100.00");
  });

  it("updateEnvelopeCommand bursts all occurrences from startDate when updating schedule with past startDate", async () => {
    let insertedExpensePayloads: Array<Record<string, unknown>> = [];
    const pastStartDate = "2026-01-01";
    const todayAest = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: unknown) => {
          if (table === tenants) {
            return {
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ timezone: "Australia/Sydney" }]),
              }),
            };
          }
          return {
            where: vi.fn().mockResolvedValue([
              {
                id: "env-update-past",
                name: "Past Rent",
                envelopeType: "BILL",
                fundingMode: "RECURRING",
                budgetFrequency: "MONTHLY",
                isPrivate: false,
                generateEvents: true,
                startDate: pastStartDate,
                rrule: "FREQ=MONTHLY;INTERVAL=1",
                enteredAmount: "500.00",
                monthlyAmount: "500.00",
              },
            ]),
          };
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "env-update-past",
                name: "Past Rent Updated",
                envelopeType: "BILL",
                fundingMode: "RECURRING",
                budgetFrequency: "FORTNIGHTLY",
                isPrivate: false,
                generateEvents: true,
                startDate: pastStartDate,
                rrule: "FREQ=WEEKLY;INTERVAL=2",
                enteredAmount: "250.00",
                monthlyAmount: "541.67",
              },
            ]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((payloads: Record<string, unknown>[]) => {
          insertedExpensePayloads = payloads;
          return Promise.resolve(payloads);
        }),
      })),
      transaction: vi.fn().mockImplementation((cb: (tx: DbOrTx) => unknown) => cb(mockDb as unknown as DbOrTx)),
    } as unknown as DbOrTx;

    await updateEnvelopeCommand(
      "env-update-past",
      {
        budgetFrequency: "FORTNIGHTLY",
        enteredAmount: "250.00",
      },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    expect(insertedExpensePayloads.length).toBeGreaterThan(0);
    // Updated schedule bursts from startDate forward (including past startDate occurrences)
    expect(insertedExpensePayloads[0].expectedDate).toBe(pastStartDate);
    expect(insertedExpensePayloads.some((ev) => String(ev.expectedDate) < todayAest)).toBe(true);
  });

  it("createEnvelopeCommand normalizes generateEvents to false for non-recurring envelopes", async () => {
    let insertedEnvelopeValues: Record<string, unknown> | null = null;
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: "acc-1", isPrivate: false, userId: null }]),
        }),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          insertedEnvelopeValues = vals;
          return {
            returning: vi.fn().mockResolvedValue([{ id: "env-goal-1", ...vals }]),
          };
        }),
      })),
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
    } as unknown as DbOrTx;

    await createEnvelopeCommand(
      {
        name: "Emergency Fund",
        envelopeType: "GOAL",
        fundingMode: "TARGET_BALANCE",
        bankAccountId: "acc-1",
        targetAmount: "5000.00",
        generateEvents: true,
      },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    expect(insertedEnvelopeValues).not.toBeNull();
    expect((insertedEnvelopeValues as unknown as Record<string, unknown>).generateEvents).toBe(false);
  });

  it("updateEnvelopeCommand allows moving an envelope to another bank account with the same privacy tier", async () => {
    let updatedValues: Record<string, unknown> | null = null;
    let selectCall = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall += 1;
            if (selectCall === 1) {
              return Promise.resolve([
                {
                  id: "env-ed-1",
                  name: "Everyday Spending",
                  envelopeType: "EVERYDAY",
                  fundingMode: "TARGET_BALANCE",
                  bankAccountId: "bank-shared-1",
                  isPrivate: false,
                  isSurplusTarget: true,
                  generateEvents: false,
                },
              ]);
            }
            const accountRow = [{ id: selectCall === 2 ? "bank-shared-1" : "bank-shared-2", isPrivate: false, userId: null }];
            return Object.assign(Promise.resolve(accountRow), {
              limit: vi.fn().mockResolvedValue(accountRow),
            });
          }),
        }),
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          updatedValues = vals;
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "env-ed-1", ...vals }]),
            }),
          };
        }),
      })),
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
    } as unknown as DbOrTx;

    await updateEnvelopeCommand(
      "env-ed-1",
      { bankAccountId: "bank-shared-2" },
      tenantId,
      appId,
      userId,
      mockDb as unknown as DbOrTx
    );

    expect(updatedValues).not.toBeNull();
    expect((updatedValues as unknown as Record<string, unknown>).bankAccountId).toBe("bank-shared-2");
  });

  it("updateEnvelopeCommand rejects moving a shared envelope to a private bank account", async () => {
    let selectCall = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall += 1;
            if (selectCall === 1) {
              return Promise.resolve([
                {
                  id: "env-ed-1",
                  name: "Everyday Spending",
                  envelopeType: "EVERYDAY",
                  fundingMode: "TARGET_BALANCE",
                  bankAccountId: "bank-shared-1",
                  isPrivate: false,
                  isSurplusTarget: false,
                  generateEvents: false,
                },
              ]);
            }
            const accountRow =
              selectCall === 2
                ? [{ id: "bank-shared-1", isPrivate: false, userId: null }]
                : [{ id: "bank-priv-1", isPrivate: true, userId }];
            return Object.assign(Promise.resolve(accountRow), {
              limit: vi.fn().mockResolvedValue(accountRow),
            });
          }),
        }),
      })),
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
    } as unknown as DbOrTx;

    await expect(
      updateEnvelopeCommand(
        "env-ed-1",
        { bankAccountId: "bank-priv-1" },
        tenantId,
        appId,
        userId,
        mockDb as unknown as DbOrTx
      )
    ).rejects.toThrow("same privacy setting");
  });
});
