ALTER TABLE "income_events" ADD COLUMN IF NOT EXISTS "note" varchar(500);
ALTER TABLE "income_events" ADD COLUMN IF NOT EXISTS "is_overridden" boolean DEFAULT false NOT NULL;
ALTER TABLE "income_events" ADD COLUMN IF NOT EXISTS "payment_method" varchar(50);
