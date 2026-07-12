import { Inngest } from 'inngest';
import { db, deviceTokens } from '@money-matters/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const pushPayloadSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.any()).optional(),
}).strict();

export function createNotificationFunctions(inngest: Inngest) {
  const sendPushNotification = inngest.createFunction(
    { id: 'send-push-notification', retries: 3 },
    { event: 'notification/send-push' },
    async ({ event, step }) => {
      const payload = pushPayloadSchema.parse(event.data);
      const { userId, tenantId, title, body, data } = payload;

      const tokens = await step.run('fetch-device-tokens', async () => {
        return await db.query.deviceTokens.findMany({
          where: and(
            eq(deviceTokens.userId, userId),
            eq(deviceTokens.tenantId, tenantId)
          ),
        });
      });

      if (tokens.length === 0) {
        return { success: true, message: 'No device tokens registered for user', sentCount: 0 };
      }

      const messages = tokens.map((t) => ({
        to: t.token,
        sound: 'default' as const,
        title,
        body,
        data: data || {},
      }));

      const result = await step.run('dispatch-to-expo', async () => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Expo Push API returned error status ${response.status}: ${errText}`);
        }

        return await response.json();
      });

      return { success: true, sentCount: messages.length, expoResult: result };
    }
  );

  return [sendPushNotification];
}
