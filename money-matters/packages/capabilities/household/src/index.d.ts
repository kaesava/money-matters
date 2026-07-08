import { z } from "zod";
export declare const CreateHouseholdCommand: z.ZodObject<{
    name: z.ZodString;
    userId: z.ZodString;
    userEmail: z.ZodString;
    userName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    userId: string;
    userEmail: string;
    userName: string;
}, {
    name: string;
    userId: string;
    userEmail: string;
    userName: string;
}>;
export declare function createHouseholdHandler(db: any): (input: z.infer<typeof CreateHouseholdCommand>) => Promise<{
    success: boolean;
}>;
//# sourceMappingURL=index.d.ts.map