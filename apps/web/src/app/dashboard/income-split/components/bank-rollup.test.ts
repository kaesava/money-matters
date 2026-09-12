import { describe, it, expect } from "vitest";

interface BankTransferPool {
  id: string;
  name: string;
  poolType?: string;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
}

interface BankTransferAccount {
  id: string;
  name: string;
}

function computeBankRollup(params: {
  receivingAccountId?: string | null;
  pools: BankTransferPool[];
  linesMap: Record<string, string>;
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  bankAccounts: BankTransferAccount[];
}) {
  const { receivingAccountId, pools, linesMap, sweepPoolId, sweepPoolRemainder, bankAccounts } = params;
  const retained: Array<{ id: string; name: string; amount: number }> = [];
  const transferMap = new Map<string, {
    destAccountId: string;
    destAccountName: string;
    totalAmount: number;
    pools: Array<{ id: string; name: string; amount: number }>;
  }>();

  for (const pool of pools) {
    const amount =
      pool.id === sweepPoolId
        ? Math.max(0, sweepPoolRemainder)
        : parseFloat(linesMap[pool.id] || "0");

    if (amount <= 0.005) continue;

    const isSameAccount =
      (receivingAccountId && pool.bankAccountId === receivingAccountId) ||
      (!pool.bankAccountId && (!receivingAccountId || pool.bankAccountId === receivingAccountId));

    if (isSameAccount) {
      retained.push({ id: pool.id, name: pool.name, amount });
    } else {
      const destId = pool.bankAccountId || "unknown-dest";
      const destAcc = bankAccounts.find((a) => a.id === destId);
      const destName = pool.bankAccountName || destAcc?.name || "External Account";

      const existing = transferMap.get(destId);
      if (existing) {
        existing.totalAmount += amount;
        existing.pools.push({ id: pool.id, name: pool.name, amount });
      } else {
        transferMap.set(destId, {
          destAccountId: destId,
          destAccountName: destName,
          totalAmount: amount,
          pools: [{ id: pool.id, name: pool.name, amount }],
        });
      }
    }
  }

  const retainedTotal = retained.reduce((sum, item) => sum + item.amount, 0);
  const externalTransfers = Array.from(transferMap.values());

  return { retained, retainedTotal, externalTransfers };
}

describe("Bank Transfer Rollup Engine", () => {
  const bankAccounts: BankTransferAccount[] = [
    { id: "acc-cba", name: "CommBank Everyday (Deposit Account)" },
    { id: "acc-up", name: "Up Bank Bills" },
    { id: "acc-ing", name: "ING Savings Maximiser" },
  ];

  const pools: BankTransferPool[] = [
    { id: "p-everyday", name: "Everyday Spending", poolType: "EVERYDAY", bankAccountId: "acc-cba" },
    { id: "p-rent", name: "Rent", poolType: "REGULAR", bankAccountId: "acc-up" },
    { id: "p-power", name: "Electricity", poolType: "REGULAR", bankAccountId: "acc-up" },
    { id: "p-internet", name: "NBN Internet", poolType: "REGULAR", bankAccountId: "acc-up" },
    { id: "p-emergency", name: "Emergency Fund", poolType: "GOAL", bankAccountId: "acc-ing" },
    { id: "p-holiday", name: "Japan Holiday", poolType: "GOAL", bankAccountId: "acc-ing" },
    { id: "p-coffee", name: "Coffee Fund", poolType: "EVERYDAY", bankAccountId: "acc-cba" },
  ];

  it("classifies pools in the paycheck receiving account as retained with zero external transfer", () => {
    const result = computeBankRollup({
      receivingAccountId: "acc-cba",
      pools,
      linesMap: {
        "p-coffee": "50.00",
      },
      sweepPoolId: "p-everyday",
      sweepPoolRemainder: 450.0,
      bankAccounts,
    });

    expect(result.retained).toHaveLength(2);
    expect(result.retainedTotal).toBe(500.0);
    expect(result.externalTransfers).toHaveLength(0);
  });

  it("rolls up multiple bill pools in the same destination bank into 1 single transfer", () => {
    const result = computeBankRollup({
      receivingAccountId: "acc-cba",
      pools,
      linesMap: {
        "p-rent": "1200.00",
        "p-power": "150.00",
        "p-internet": "75.00",
      },
      sweepPoolId: "p-everyday",
      sweepPoolRemainder: 0,
      bankAccounts,
    });

    expect(result.externalTransfers).toHaveLength(1);
    const upTransfer = result.externalTransfers[0]!;
    expect(upTransfer.destAccountId).toBe("acc-up");
    expect(upTransfer.totalAmount).toBe(1425.0);
    expect(upTransfer.pools).toHaveLength(3);
    expect(upTransfer.pools.map((p) => p.name)).toEqual(["Rent", "Electricity", "NBN Internet"]);
  });

  it("correctly segregates multiple destination bank accounts and retained funds", () => {
    const result = computeBankRollup({
      receivingAccountId: "acc-cba",
      pools,
      linesMap: {
        "p-rent": "1200.00",
        "p-power": "150.00",
        "p-internet": "75.00",
        "p-emergency": "300.00",
        "p-holiday": "200.00",
        "p-coffee": "50.00",
      },
      sweepPoolId: "p-everyday",
      sweepPoolRemainder: 400.0,
      bankAccounts,
    });

    // Retained in CBA: Everyday ($400) + Coffee ($50) = $450
    expect(result.retainedTotal).toBe(450.0);
    expect(result.retained).toHaveLength(2);

    // External Transfers: Exactly 2 transfers!
    // 1 to Up Bank: $1,425.00
    // 1 to ING: $500.00
    expect(result.externalTransfers).toHaveLength(2);

    const upTransfer = result.externalTransfers.find((t) => t.destAccountId === "acc-up");
    expect(upTransfer?.totalAmount).toBe(1425.0);
    expect(upTransfer?.pools).toHaveLength(3);

    const ingTransfer = result.externalTransfers.find((t) => t.destAccountId === "acc-ing");
    expect(ingTransfer?.totalAmount).toBe(500.0);
    expect(ingTransfer?.pools).toHaveLength(2);
  });
});
