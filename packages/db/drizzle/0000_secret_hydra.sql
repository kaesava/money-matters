CREATE TABLE IF NOT EXISTS "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"household_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"balance" varchar(255) DEFAULT '0' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "category_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"group_id" uuid,
	"is_default_excess" boolean DEFAULT false,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "category_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"annual_amount" varchar(255),
	"priority" varchar(50) NOT NULL,
	"recurrence_rule" text,
	"next_due_date" timestamp,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"direction" varchar(10) NOT NULL,
	"income_type" varchar(20),
	"amount" numeric(12, 2) NOT NULL,
	"frequency_cron" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "income_allocation_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"income_amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"allocation_splits_manifest" jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transaction_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"snapshot_id" uuid,
	"flow_type" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"idempotency_key" text NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp,
	CONSTRAINT "transaction_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_group_id_category_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."category_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_schedules" ADD CONSTRAINT "financial_schedules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "income_allocation_snapshots" ADD CONSTRAINT "income_allocation_snapshots_schedule_id_financial_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."financial_schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_ledger" ADD CONSTRAINT "transaction_ledger_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_ledger" ADD CONSTRAINT "transaction_ledger_snapshot_id_income_allocation_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."income_allocation_snapshots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
