import { db, users } from "@money-matters/db";

/**
 * Upserts a user in the local mirror table when verified JWT claims are processed.
 * Ensures the public.users record is always kept in sync with the identity provider.
 */
export async function upsertUserFromJwt(userId: string, email: string, displayName?: string) {
  await db
    .insert(users)
    .values({
      id: userId,
      email,
      displayName,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        displayName,
        updatedAt: new Date(),
      },
    });
}
