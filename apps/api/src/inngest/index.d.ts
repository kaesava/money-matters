export declare const functions: import("inngest").InngestFunction<Omit<import("inngest").InngestFunction.Options<import("inngest").Inngest<{
    id: string;
}>, import("inngest").InngestMiddleware.Stack, [{
    event: string;
}], import("inngest").Handler<import("inngest").Inngest<{
    id: string;
}>, string, {
    event: import("inngest").FailureEventPayload<import("inngest").EventPayload<any>>;
    logger: import("inngest").Logger;
    error: Error;
}>>, "triggers">, ({ event, step }: import("inngest").Context<import("inngest").Inngest<{
    id: string;
}>, string, {
    logger: import("inngest").Logger;
}>) => Promise<{
    tenantId: string;
    status: string;
}>, import("inngest").Handler<import("inngest").Inngest<{
    id: string;
}>, string, {
    event: import("inngest").FailureEventPayload<import("inngest").EventPayload<any>>;
    logger: import("inngest").Logger;
    error: Error;
}>, import("inngest").Inngest<{
    id: string;
}>, import("inngest").InngestMiddleware.Stack, [{
    event: string;
}]>[];
//# sourceMappingURL=index.d.ts.map