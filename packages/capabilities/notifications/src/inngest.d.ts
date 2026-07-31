import { Inngest } from 'inngest';
export declare function createNotificationFunctions(inngest: Inngest): import("inngest").InngestFunction<Omit<import("inngest").InngestFunction.Options<Inngest<import("inngest").ClientOptions>, import("inngest").InngestMiddleware.Stack, [{
    event: string;
}], import("inngest").Handler<Inngest<import("inngest").ClientOptions>, string, {
    error: Error;
    event: import("inngest").FailureEventPayload<import("inngest").EventPayload<any>>;
    logger: import("inngest").Logger;
}>>, "triggers">, ({ event, step }: import("inngest").Context<Inngest<import("inngest").ClientOptions>, string, {
    logger: import("inngest").Logger;
}>) => Promise<{
    success: boolean;
    message: string;
    sentCount: number;
    expoResult?: undefined;
} | {
    success: boolean;
    sentCount: number;
    expoResult: any;
    message?: undefined;
}>, import("inngest").Handler<Inngest<import("inngest").ClientOptions>, string, {
    error: Error;
    event: import("inngest").FailureEventPayload<import("inngest").EventPayload<any>>;
    logger: import("inngest").Logger;
}>, Inngest<import("inngest").ClientOptions>, import("inngest").InngestMiddleware.Stack, [{
    event: string;
}]>[];
//# sourceMappingURL=inngest.d.ts.map