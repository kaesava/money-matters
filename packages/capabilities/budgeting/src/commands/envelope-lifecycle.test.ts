import { describe, it, expect, vi } from "vitest";
import { createEnvelopeCommand } from "./create-envelope.command.js";
import { updateEnvelopeCommand } from "./update-envelope.command.js";
import { overrideEventCommand } from "./override-event.command.js";
import { maintainRollingWindowCommand } from "./maintain-rolling-window.command.js";
import { restoreItemCommand } from "./restore-item.command.js";
import { envelopes, expenseEvents } from "@money-matters/db";
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
              { id: "env-1", name: "Gym Membership", envelopeType: "SCHEDULED_BILL", generateEvents: true },
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
        envelopeType: "SCHEDULED_BILL",
        bankAccountId: "bank-1",
        enteredAmount: "50.00",
        budgetFrequency: "MONTHLY",
        generateEvents: true, goalMode: "TARGET_DATE",
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
              { id: "env-2", name: "Spotify", envelopeType: "SCHEDULED_BILL", generateEvents: false },
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
        envelopeType: "SCHEDULED_BILL",
        bankAccountId: "bank-1",
        enteredAmount: "15.00",
        budgetFrequency: "MONTHLY",
        generateEvents: false, goalMode: "TARGET_DATE",
      },
      tenantId,
      appId,
      userId,
      mockDb
    );

    expect(insertedEvents.length).toBe(0);
  });

  it("updateEnvelopeCommand clears pending events when converted to FLEXIBLE_BILL", async () => {
    let deletedEvents = false;
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "env-1",
              name: "Power",
              envelopeType: "SCHEDULED_BILL",
              isPrivate: false,
              generateEvents: true, goalMode: "TARGET_DATE",
            },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: "env-1", name: "Power", envelopeType: "FLEXIBLE_BILL", generateEvents: true },
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
        envelopeType: "FLEXIBLE_BILL",
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

  it("maintainRollingWindowCommand skips envelopes where generateEvents is false", async () => {
    let queriedGenerateEvents = false;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue([{ timezone: "Australia/Sydney" }]),
            then: (resolve: any) => {
              queriedGenerateEvents = true;
              return Promise.resolve([]).then(resolve);
            },
          })),
        }),
      })),
    } as unknown as DbOrTx;

    const res = await maintainRollingWindowCommand({
      db: mockDb,
      tenantId,
      appId,
      userId,
    });
    expect(queriedGenerateEvents).toBe(true);
    expect(res.newEventsCount).toBe(0);
  });

  it("restoreItemCommand does not burst if envelope has generateEvents === false", async () => {
    let insertedEvents = false;
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { isPrivate: false, bankAccountUserId: null, generateEvents: false },
            ]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "env-opted-out",
                name: "Opted Out Bill",
                envelopeType: "SCHEDULED_BILL",
                generateEvents: false, goalMode: "TARGET_DATE",
                rrule: "FREQ=MONTHLY;INTERVAL=1",
                startDate: "2026-11-01",
                monthlyAmount: "50.00",
              },
            ]),
          }),
        }),
      }),
      insert: vi.fn().mockImplementation(() => {
        insertedEvents = true;
        return { values: vi.fn().mockResolvedValue([]) };
      }),
    } as unknown as DbOrTx;

    await restoreItemCommand("env-opted-out", "ENVELOPE", tenantId, appId, userId, mockDb);
    expect(insertedEvents).toBe(false);
  });
});
