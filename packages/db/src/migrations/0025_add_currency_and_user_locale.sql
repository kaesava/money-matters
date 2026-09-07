ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'AUD' NOT NULL;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "language" varchar(10) DEFAULT 'en' NOT NULL;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "locale" varchar(20) DEFAULT 'auto' NOT NULL;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "timezone" varchar(100);
