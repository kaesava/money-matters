import { Inngest } from 'inngest';
export declare function createScheduledNotificationFunctions(inngest: Inngest): import("inngest").InngestFunction<Omit<import("inngest").InngestFunction.Options<Inngest<import("inngest").ClientOptions>, import("inngest").InngestMiddleware.Stack, [{
    cron: string;
}], import("inngest").Handler<Inngest<import("inngest").ClientOptions>, "inngest/scheduled.timer", {
    error: Error;
    event: import("inngest").FailureEventPayload<import("inngest").EventPayload<any>>;
    logger: import("inngest").Logger;
}>>, "triggers">, ({ step }: import("inngest").Context<Inngest<import("inngest").ClientOptions>, "inngest/scheduled.timer", {
    logger: import("inngest").Logger;
}>) => Promise<{
    count: number;
}>, import("inngest").Handler<Inngest<import("inngest").ClientOptions>, "inngest/scheduled.timer", {
    error: Error;
    event: import("inngest").FailureEventPayload<import("inngest").EventPayload<any>>;
    logger: import("inngest").Logger;
}>, Inngest<import("inngest").ClientOptions>, import("inngest").InngestMiddleware.Stack, [{
    cron: string;
}]>[];
//# sourceMappingURL=scheduled-notifications.d.ts.map