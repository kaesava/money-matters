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
        from: vi.fn().mockImplementation((table: any) => {
          if (table === tenants) {
            return {
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ timezone: "Australia/Sydney" }]),
              }),
            };
          }
          return {
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { isPrivate: false, bankAccountUserId: null, generateEvents: false, archivedAt: new Date() },
              ]),
            }),
          };
        }),
      }),
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "env-opted-out",
                name: "Opted Out Bill",
                envelopeType: "BILL",
                fundingMode: "RECURRING",
                generateEvents: false,
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

  it("maintainRollingWindowCommand incrementally bursts only occurrences strictly after lastBurstDate", async () => {
    let insertedExpensePayloads: any[] = [];
    let updatedEnvelopePayload: any = null;

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === tenants) {
              return { limit: vi.fn().mockResolvedValue([{ timezone: "Australia/Sydney" }]) };
            }
            if (table === incomeSources) {
              return Promise.resolve([]);
            }
            if (table === envelopes) {
              return Promise.resolve([
                {
                  id: "env-incremental",
                  name: "Internet Bill",
                  envelopeType: "BILL",
                  fundingMode: "RECURRING",
                  generateEvents: true,
                  rrule: "FREQ=MONTHLY;INTERVAL=1",
                  startDate: "2026-01-01",
                  enteredAmount: "80.00",
                  monthlyAmount: "80.00",
                  // Already burst up to 6 months in the future from 2026-01-01
                  lastBurstDate: "2026-06-01",
                },
              ]);
            }
            return Promise.resolve([]);
          }),
        })),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((payloads: any[]) => {
          insertedExpensePayloads = payloads;
          return Promise.resolve(payloads);
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((payload: any) => {
          updatedEnvelopePayload = payload;
          return {
            where: vi.fn().mockResolvedValue([]),
          };
        }),
      }),
    } as unknown as DbOrTx;

    const res = await maintainRollingWindowCommand({
      db: mockDb,
      tenantId,
      appId,
      userId,
    });

    expect(res.success).toBe(true);
    expect(res.expenseEventsCreated).toBeGreaterThan(0);
    // All inserted events must have expectedDate > 2026-06-01
    for (const ev of insertedExpensePayloads) {
      expect(ev.expectedDate > "2026-06-01").toBe(true);
    }
    // Verify lastBurstDate on envelope is advanced
    expect(updatedEnvelopePayload).toBeDefined();
    expect(updatedEnvelopePayload.lastBurstDate > "2026-06-01").toBe(true);
  });

  it("restoreItemCommand bursts all occurrences from startDate even when restored item had past startDate", async () => {
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
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { isPrivate: false, bankAccountUserId: null, generateEvents: true, archivedAt: new Date() },
              ]),
            }),
          };
        }),
      }),
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: "env-past-restore",
                name: "Old Gym Membership",
                envelopeType: "BILL",
                fundingMode: "RECURRING",
                generateEvents: true,
                rrule: "FREQ=MONTHLY;INTERVAL=1",
                startDate: pastStartDate,
                monthlyAmount: "50.00",
                enteredAmount: "50.00",
              },
            ]),
          }),
        }),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((payloads: any[]) => {
          insertedExpensePayloads = payloads;
          return Promise.resolve(payloads);
        }),
      })),
    } as unknown as DbOrTx;

    await restoreItemCommand("env-past-restore", "ENVELOPE", tenantId, appId, userId, mockDb);
    expect(insertedExpensePayloads.length).toBeGreaterThan(0);
    // Restored events burst from startDate forward (including past startDate occurrences)
    expect(insertedExpensePayloads[0].expectedDate).toBe(pastStartDate);
    expect(insertedExpensePayloads.some((ev) => ev.expectedDate < todayAest)).toBe(true);
  });

});
