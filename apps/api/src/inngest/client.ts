import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "money-matters-api-service" });

/**
 * Syncs Cloudflare Worker runtime INNGEST_EVENT_KEY onto the module-scoped Inngest client
 * after env bindings are hydrated inside fetch().
 */
export function syncInngestEventKey(eventKey?: string): void {
  if (!eventKey) return;
  const clientWithSetter = inngest as unknown as { setEventKey?: (key: string) => void };
  if (typeof clientWithSetter.setEventKey === "function") {
    clientWithSetter.setEventKey(eventKey);
  }
}
