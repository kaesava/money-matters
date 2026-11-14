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
    let insertedEvents: any[] = [];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "bank-1", isPrivate: false, userId: null },
          ]),
        }),
      }),
      insert: vi.fn().mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((vals: any) => {
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
      transaction: vi.fn().mockImplementation((cb: any) => cb(mockDb)),
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
      mockDb
    );

    expect(insertedEvents.length).toBe(12);
  });

  it("createEnvelopeCommand does NOT burst events when generateEvents is false", async () => {
    let insertedEvents: any[] = [];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "bank-1", isPrivate: false, userId: null },
          ]),
        }),
      }),
      insert: vi.fn().mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((vals: any) => {
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
      transaction: vi.fn().mockImplementation((cb: any) => cb(mockDb)),
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
      mockDb
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
      delete: vi.fn().mockImplementation((table: any) => ({
        where: vi.fn().mockImplementation(() => {
          if (table === expenseEvents) deletedEvents = true;
          return Promise.resolve();
        }),
      })),
      transaction: vi.fn().mockImplementation((cb: any) => cb(mockDb)),
    } as unknown as DbOrTx;

    await updateEnvelopeCommand(
      "env-1",
      {
        fundingMode: "TARGET_BALANCE",
      },
      tenantId,
      appId,
      userId,
      mockDb
    );

    expect(deletedEvents).toBe(true);
  });

  it("overrideEventCommand recalculates monthlyAmount respecting budgetFrequency when updateSeries is true", async () => {
    let updatedEnvelopePayload: any = null;
    let updatedSubsequentEvents: any = null;

    const mockDb: any = {
      update: vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockImplementation((payload: any) => ({
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
              updatedEnvelopePayload = payload;
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
    mockDb.transaction = vi.fn().mockImplementation((cb: any) => cb(mockDb));

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
    expect(updatedEnvelopePayload.monthlyAmount).toBe("216.67");
    expect(updatedEnvelopePayload.enteredAmount).toBe("100.00");
  });

  it("updateEnvelopeCommand bursts all occurrences from startDate when updating schedule with past startDate", async () => {
    let insertedExpensePayloads: any[] = [];
    const pastStartDate = "2026-01-01";
    const todayAest = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: any) => {
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
        values: vi.fn().mockImplementation((payloads: any[]) => {
          insertedExpensePayloads = payloads;
          return Promise.resolve(payloads);
        }),
      })),
      transaction: vi.fn().mockImplementation((cb: any) => cb(mockDb)),
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
      mockDb
    );

    expect(insertedExpensePayloads.length).toBeGreaterThan(0);
    // Updated schedule bursts from startDate forward (including past startDate occurrences)
    expect(insertedExpensePayloads[0].expectedDate).toBe(pastStartDate);
    expect(insertedExpensePayloads.some((ev) => ev.expectedDate < todayAest)).toBe(true);
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
      mockDb
    );

    expect(insertedEnvelopeValues).not.toBeNull();
    expect((insertedEnvelopeValues as unknown as Record<string, unknown>).generateEvents).toBe(false);
  });
});
