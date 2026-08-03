import { db, tenants, tenantUsers, users, userPreferences } from "./index.js";
import { sql, and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function main() {
  const email = "tester-play@kaesava.au";
  const name = "Play Store Tester";
  
  // Use a strong, random 12-character alphanumeric password
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let password = "";
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
  if (!authUrl) {
    console.error("Error: NEXT_PUBLIC_NEON_AUTH_URL is not set.");
    process.exit(1);
  }

  console.log(`Targeting Database: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0]}`);
  console.log(`Auth Server: ${authUrl}`);
  console.log(`Registering Play Tester: ${email}`);

  let userId: string | null = null;

  try {
    // 1. Check if user already exists in neon_auth.user schema
    const checkRes = await db.execute<{ id: string }>(
      sql`SELECT id FROM neon_auth.user WHERE email = ${email} LIMIT 1`
    );
    const rows = Array.isArray(checkRes) ? checkRes : (checkRes as any)?.rows ?? [];
    if (rows.length > 0) {
      userId = rows[0].id;
      console.log(`User already exists in Neon Auth. Reusing user ID: ${userId}`);
    } else {
      // 2. Call the Neon Auth Sign Up REST API
      const signupUrl = `${authUrl}/sign-up/email`;
      console.log("Sending sign-up request to Neon Auth...");
      const origin = authUrl.includes("ep-icy-resonance")
        ? "http://localhost:3000"
        : "https://moneymatters.kaesava.au";

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
        throw new Error(`Neon Auth returned status ${response.status}: ${errText}`);
      }

      const resBody = (await response.json()) as any;
      userId = resBody.user?.id || resBody.id;
      if (!userId) {
        throw new Error(`Failed to extract user ID from signup response: ${JSON.stringify(resBody)}`);
      }
      console.log(`Successfully registered in Neon Auth. New User ID: ${userId}`);
    }

    // 3. Upsert user in public.users table
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

    // 4. Check if tenant already exists for user
    const existingTenantUser = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.userId, userId!), eq(tenantUsers.role, "OWNER")))
      .limit(1);

    if (existingTenantUser.length > 0) {
      console.log(`Tenant already mapped for user. Tenant ID: ${existingTenantUser[0].tenantId}`);
    } else {
      // 5. Create new tenant
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
        trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        trialGraceEndsAt: new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000),
        tenantId,
        appId,
        createdBy: userId!,
        updatedBy: userId!,
      });
      console.log(`Created new Tenant: ${tenantId}`);

      // 6. Link User to Tenant in tenantUsers
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

      // 7. Ensure User Preferences exist
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
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log("==============================================\n");

  } catch (err) {
    console.error("Execution failed:", err);
    process.exit(1);
  }
}

main();
