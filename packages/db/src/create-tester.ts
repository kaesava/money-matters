import { db, tenants, tenantUsers, users, userPreferences } from "./index.js";
import { sql, and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function main() {
  const email = "tester-play@kaesava.au";
  const name = "Play Store Tester";
  
  const isProd = process.env.NODE_ENV === "production" || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("ep-spring-snow"));
  const password = isProd ? "whtVT!lNWPp9yb" : "j0niOxWVA7nt#c";

  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || (isProd ? "https://ep-spring-snow-a70f61xz.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth" : "https://ep-icy-resonance-a7s94hg4.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth");

  console.log(`Targeting Database: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0]}`);
  console.log(`Environment: ${isProd ? "PROD" : "DEV"}`);
  console.log(`Auth Server: ${authUrl}`);
  console.log(`Setting up Play Tester: ${email}`);

  let userId: string | null = null;

  try {
    // 1. Delete pre-existing user in neon_auth.user to guarantee fresh password registration
    try {
      await db.execute(sql`DELETE FROM neon_auth.user WHERE email = ${email}`);
      console.log("Cleaned up any existing neon_auth record.");
    } catch (e) {
      console.log("Pre-existing neon_auth cleanup bypassed.");
    }

    // 2. Call the Neon Auth Sign Up REST API
    const signupUrl = `${authUrl}/sign-up/email`;
    console.log("Sending sign-up request to Neon Auth...");
    const origin = isProd ? "https://moneymatters.kaesava.au" : "http://localhost:3000";

    const response = await fetch(signupUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": origin,
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Neon Auth API returned status ${response.status}: ${errText}`);
    } else {
      const resBody = (await response.json()) as any;
      userId = resBody.user?.id || resBody.id;
      console.log(`Successfully registered in Neon Auth. New User ID: ${userId}`);
    }

    // 3. Update/Insert in neon_auth.user ensuring emailVerified is TRUE
    const checkRes = await db.execute<{ id: string }>(
      sql`SELECT id FROM neon_auth.user WHERE email = ${email} LIMIT 1`
    );
    const rows = Array.isArray(checkRes) ? checkRes : (checkRes as any)?.rows ?? [];
    if (rows.length > 0) {
      userId = rows[0].id;
      await db.execute(sql`UPDATE neon_auth.user SET "emailVerified" = true WHERE email = ${email}`);
      console.log("Marked emailVerified = true in neon_auth.user.");
    } else {
      userId = userId || "d3b07384-d113-4ec4-a5a4-000000000002";
      await db.execute(sql`
        INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES (${userId}, ${name}, ${email}, true, now(), now())
      `);
      console.log("Inserted user into neon_auth.user with emailVerified = true.");
    }

    // 4. Upsert user in public.users table
    await db
      .insert(users)
      .values({
        id: userId!,
        email,
        displayName: name,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { displayName: name },
      });
    console.log("Upserted user in public.users.");

    // 5. Check if tenant already exists for user
    const existingTenantUser = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.userId, userId!), eq(tenantUsers.role, "OWNER")))
      .limit(1);

    if (existingTenantUser.length > 0) {
      console.log(`Tenant already mapped for user. Tenant ID: ${existingTenantUser[0].tenantId}`);
    } else {
      // 6. Create new tenant
      const tenantId = randomUUID();
      const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
      const now = new Date();

      await db.insert(tenants).values({
        id: tenantId,
        name: `${name} Household`,
        fyEndMonthDay: "06-30",
        premiumEnabled: true,
        subscriptionStatus: "TRIAL_ACTIVE",
        trialStartedAt: now,
        trialEndsAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
        tenantId,
        appId,
        createdBy: userId!,
        updatedBy: userId!,
      });
      console.log(`Created new Tenant: ${tenantId}`);

      // 7. Link User to Tenant in tenantUsers
      await db.insert(tenantUsers).values({
        tenantId,
        userId: userId!,
        role: "OWNER",
        inviteStatus: "ACCEPTED",
        appId,
        createdBy: userId!,
        updatedBy: userId!,
      });
      console.log("Linked user to tenant in tenant_users.");

      // 8. Ensure User Preferences exist
      await db.insert(userPreferences).values({
        id: randomUUID(),
        userId: userId!,
        tenantId,
        timezone: "Australia/Sydney",
      });
      console.log("Created user preferences.");
    }

    console.log("\n==============================================");
    console.log("🎉 PLAY TESTER SETUP COMPLETED SUCCESSFULLY!");
    console.log(`Environment: ${isProd ? "PROD" : "DEV"}`);
    console.log(`Email:       ${email}`);
    console.log(`Password:    ${password}`);
    console.log(`Verified:    TRUE`);
    console.log("==============================================\n");

  } catch (err) {
    console.error("Execution failed:", err);
    process.exit(1);
  }
}

main();
