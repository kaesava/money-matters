export interface WorkerEnv {
    MONEY_MATTERS_APP_ID: string;
    STORAGE_BUCKET_NAME: string;
    STORAGE_ENDPOINT: string;
    STORAGE_REGION: string;
    GLOBAL_MAX_FILE_SIZE_MB: string;
    NEXT_PUBLIC_NEON_AUTH_URL: string;
    NEON_AUTH_BASE_URL: string;
    NEON_AUTH_JWKS_URL: string;
    DATABASE_URL?: string;
    INNGEST_SIGNING_KEY?: string;
    INNGEST_EVENT_KEY?: string;
    RESEND_API_KEY?: string;
}
declare const _default: {
    fetch(request: Request, env: WorkerEnv, ctx: {
        waitUntil: (promise: Promise<unknown>) => void;
    }): Promise<Response>;
};
export default _default;
//# sourceMappingURL=worker.d.ts.map