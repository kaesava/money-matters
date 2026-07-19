import { db, categories } from "@money-matters/db";
import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

export async function archiveBucketCommand(
  bucketId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: PgDatabase<any, any, any> = db
) {
  const [archived] = await dbClient
    .update(categories)
    .set({
      archivedAt: new Date(),
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(categories.id, bucketId),
        eq(categories.tenantId, tenantId),
        eq(categories.appId, appId)
      )
    )
    .returning();

  return archived;
}
