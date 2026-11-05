import { expenseEvents, incomeEvents, transferEvents, transactionLedger } from "@money-matters/db";

export async function seedHouseholdEvents(
  db: any,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    misaAccountId: string;
    envelopeMap: Map<string, any>;
  }
) {
  const { tenantId, appId, userId, misaAccountId, envelopeMap } = params;

  const ratesEnvelope = envelopeMap.get("council_rates")!;
  const schoolEnvelope = envelopeMap.get("school_fees")!;
  const billsEnvelope = envelopeMap.get("bills")!;

  await db.insert(expenseEvents).values([
    {
      envelopeId: ratesEnvelope.id,
      name: "Council Rates Q1 Instalment",
      expectedDate: "2026-09-30",
      expectedAmount: "675.00",
      isScheduled: true,
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: schoolEnvelope.id,
      name: "School Fees Q4 Instalment",
      expectedDate: "2026-10-01",
      expectedAmount: "3750.00",
      isScheduled: true,
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: billsEnvelope.id,
      name: "Dental Checkup & Cleaning",
      expectedDate: "2026-09-20",
      actualDate: null,
      expectedAmount: "280.00",
      actualAmount: null,
      isScheduled: false,
      note: "Annual checkup and dental x-rays (overdue)",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: ratesEnvelope.id,
      name: "Supplementary Water Rates Adjustment",
      expectedDate: "2026-10-15",
      actualDate: null,
      expectedAmount: "145.50",
      actualAmount: null,
      isScheduled: false,
      note: "Yarra Valley Water supplementary drainage charge",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: envelopeMap.get("charu_travel")!.id,
      name: "Charu Aunty Flight Booking",
      expectedDate: "2026-09-15",
      actualDate: "2026-09-15",
      expectedAmount: "1450.00",
      actualAmount: "1450.00",
      isScheduled: false,
      note: "Singapore Airlines Melbourne to New Delhi return flight",
      status: "CONFIRMED" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  await db.insert(incomeEvents).values([
    {
      incomeSourceId: null,
      name: "ATO Tax Refund FY26",
      expectedDate: "2026-10-18",
      expectedAmount: "1850.00",
      status: "PENDING" as const,
      note: "Annual individual tax assessment notice refund",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  await db.insert(transferEvents).values([
    {
      sourceEnvelopeId: envelopeMap.get("emergency")!.id,
      destinationEnvelopeId: envelopeMap.get("surplus_offset")!.id,
      name: "Scheduled Surplus Sweep",
      expectedDate: "2026-09-24",
      expectedAmount: "500.00",
      status: "PENDING" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      sourceEnvelopeId: envelopeMap.get("emergency")!.id,
      destinationEnvelopeId: envelopeMap.get("unexpected")!.id,
      name: "Ad-hoc Reserve Cushioning Transfer",
      expectedDate: "2026-09-18",
      expectedAmount: "250.00",
      actualAmount: "250.00",
      status: "CONFIRMED" as const,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);

  const transferGroupId = "d3b07384-d113-4ec4-a5a4-000000000088";
  await db.insert(transactionLedger).values([
    {
      envelopeId: envelopeMap.get("emergency")!.id,
      bankAccountId: misaAccountId,
      flowType: "DEBIT" as const,
      transactionType: "TRANSFER_OUT" as const,
      amount: "250.00",
      transferGroupId,
      idempotencyKey: "transfer-out-emergency-unexpected-2026-09-18",
      note: "Inter-envelope transfer to Unexpected Expenses Reserve",
      source: "MANUAL" as const,
      recordedAt: new Date("2026-09-18T11:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: envelopeMap.get("unexpected")!.id,
      bankAccountId: misaAccountId,
      flowType: "CREDIT" as const,
      transactionType: "TRANSFER_IN" as const,
      amount: "250.00",
      transferGroupId,
      idempotencyKey: "transfer-in-emergency-unexpected-2026-09-18",
      note: "Inter-envelope transfer from Emergency Reserve",
      source: "MANUAL" as const,
      recordedAt: new Date("2026-09-18T11:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      envelopeId: envelopeMap.get("emergency")!.id,
      bankAccountId: misaAccountId,
      flowType: "CREDIT" as const,
      transactionType: "ACCOUNT_ALIGNMENT" as const,
      amount: "0.00",
      idempotencyKey: "account-alignment-misa-2026-09-19",
      note: "Bank account reconciliation balance verified against CBA MISA feed",
      source: "AUTO" as const,
      recordedAt: new Date("2026-09-19T12:00:00Z"),
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    },
  ]);
}
