export declare const notificationsRouter: {
    registerToken: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            platform: "ios" | "web" | "android";
            token: string;
        };
        output: {
            id: string;
            action: "updated";
        } | {
            id: string;
            action: "created";
        };
        meta: object;
    }>;
    removeToken: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            platform: "ios" | "web" | "android";
        };
        output: {
            success: boolean;
            message: string;
        };
        meta: object;
    }>;
};
//# sourceMappingURL=notifications.router.d.ts.map