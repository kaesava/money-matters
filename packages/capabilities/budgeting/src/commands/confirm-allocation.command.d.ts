import { PgDatabase } from "drizzle-orm/pg-core";
import { z } from "zod";
export declare const ConfirmAllocationInput: z.ZodObject<{
    incomeEventId: z.ZodString;
    incomeAmount: z.ZodNumber;
    lines: z.ZodArray<z.ZodObject<{
        categoryId: z.ZodString;
        confirmedAmount: z.ZodString;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        categoryId: string;
        confirmedAmount: string;
        reasoning?: string | undefined;
    }, {
        categoryId: string;
        confirmedAmount: string;
        reasoning?: string | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    incomeEventId: string;
    lines: {
        categoryId: string;
        confirmedAmount: string;
        reasoning?: string | undefined;
    }[];
    incomeAmount: number;
}, {
    incomeEventId: string;
    lines: {
        categoryId: string;
        confirmedAmount: string;
        reasoning?: string | undefined;
    }[];
    incomeAmount: number;
}>;
export declare function confirmAllocationCommand(input: z.infer<typeof ConfirmAllocationInput>, tenantId: string, appId: string, userId: string, dbClient?: PgDatabase<any, any, any>): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    archivedBy: string | null;
    tenantId: string;
    appId: string;
    status: "PENDING" | "CONFIRMED";
    incomeEventId: string;
    totalIncomeAmount: string;
    confirmedAt: Date | null;
}>;
//# sourceMappingURL=confirm-allocation.command.d.ts.map