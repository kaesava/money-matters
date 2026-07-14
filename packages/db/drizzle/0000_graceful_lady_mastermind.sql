CREATE TYPE "public"."invite_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."member_role_enum" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."account_purpose_enum" AS ENUM('INCOME_LANDING', 'SAVINGS', 'EVERYDAY');--> statement-breakpoint
CREATE TYPE "public"."category_type_enum" AS ENUM('MAJOR', 'RECURRING', 'EVERYDAY');--> statement-breakpoint
CREATE TYPE "public"."income_source_type_enum" AS ENUM('SALARY', 'FREELANCE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."income_event_status_enum" AS ENUM('UPCOMING', 'DRAFT', 'REVIEWED', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."allocation_plan_status_enum" AS ENUM('DRAFT', 'REVIEWED', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."shortfall_status_enum" AS ENUM('BORROWED', 'PARTIAL', 'REPAID');--> statement-breakpoint
CREATE TYPE "public"."transaction_flow_enum" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"fy_end_month_day" varchar(5) DEFAULT '06-30' NOT NULL,
	"premium_enabled" boolean DEFAULT false NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role_enum" DEFAULT 'MEMBER' NOT NULL,
	"invite_token" uuid,
	"invite_status" "invite_status_enum" DEFAULT 'ACCEPTED' NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"purpose" varchar(50)[] NOT NULL,
	"last_known_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_offset" boolean DEFAULT false NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "category_type_enum" NOT NULL,
	"priority_rank" integer,
	"is_default_excess" boolean DEFAULT false NOT NULL,
	"icon" varchar(50),
	"colour" varchar(7),
	"bank_account_id" uuid,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "category_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"target_amount" numeric(12, 2) NOT NULL,
	"rrule" text,
	"due_date" date,
	"next_due_date" date,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "income_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "income_source_type_enum" DEFAULT 'SALARY' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"receiving_account_id" uuid,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "income_source_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"income_source_id" uuid NOT NULL,
	"rrule" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"occurrence_count" integer,
	"next_occurrence_date" date,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "income_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"income_source_id" uuid NOT NULL,
	"expected_date" date NOT NULL,
	"expected_amount" numeric(12, 2) NOT NULL,
	"actual_amount" numeric(12, 2),
	"status" "income_event_status_enum" DEFAULT 'UPCOMING' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "allocation_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"income_event_id" uuid NOT NULL,
	"status" "allocation_plan_status_enum" DEFAULT 'DRAFT' NOT NULL,
	"total_income_amount" numeric(12, 2) NOT NULL,
	"confirmed_at" timestamp with time zone,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "allocation_plan_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"proposed_amount" numeric(12, 2) NOT NULL,
	"confirmed_amount" numeric(12, 2),
	"reasoning" text,
	"is_shortfall_repayment" boolean DEFAULT false NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shortfall_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_category_id" uuid NOT NULL,
	"recipient_category_id" uuid NOT NULL,
	"borrowed_amount" numeric(12, 2) NOT NULL,
	"repaid_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" "shortfall_status_enum" DEFAULT 'BORROWED' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "savings_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"expected_balance" numeric(12, 2) NOT NULL,
	"actual_balance" numeric(12, 2) NOT NULL,
	"delta" numeric(12, 2) NOT NULL,
	"reconciled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transaction_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"plan_line_id" uuid,
	"flow_type" "transaction_flow_enum" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"idempotency_key" text NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "transaction_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_schedules" ADD CONSTRAINT "category_schedules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_receiving_account_id_bank_accounts_id_fk" FOREIGN KEY ("receiving_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_source_schedules" ADD CONSTRAINT "income_source_schedules_income_source_id_income_sources_id_fk" FOREIGN KEY ("income_source_id") REFERENCES "public"."income_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_events" ADD CONSTRAINT "income_events_income_source_id_income_sources_id_fk" FOREIGN KEY ("income_source_id") REFERENCES "public"."income_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_plans" ADD CONSTRAINT "allocation_plans_income_event_id_income_events_id_fk" FOREIGN KEY ("income_event_id") REFERENCES "public"."income_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_plan_lines" ADD CONSTRAINT "allocation_plan_lines_plan_id_allocation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."allocation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_plan_lines" ADD CONSTRAINT "allocation_plan_lines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortfall_events" ADD CONSTRAINT "shortfall_events_donor_category_id_categories_id_fk" FOREIGN KEY ("donor_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortfall_events" ADD CONSTRAINT "shortfall_events_recipient_category_id_categories_id_fk" FOREIGN KEY ("recipient_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_reconciliations" ADD CONSTRAINT "savings_reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_ledger" ADD CONSTRAINT "transaction_ledger_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_ledger" ADD CONSTRAINT "transaction_ledger_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_ledger" ADD CONSTRAINT "transaction_ledger_plan_line_id_allocation_plan_lines_id_fk" FOREIGN KEY ("plan_line_id") REFERENCES "public"."allocation_plan_lines"("id") ON DELETE no action ON UPDATE no action;

-- 1. Custom Indexes for Performance & Partition Keys
CREATE INDEX IF NOT EXISTS "tenants_tenant_app_idx" ON "tenants" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "tenant_users_tenant_app_idx" ON "tenant_users" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "bank_accounts_tenant_app_idx" ON "bank_accounts" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "categories_tenant_app_idx" ON "categories" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "category_schedules_tenant_app_idx" ON "category_schedules" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "income_sources_tenant_app_idx" ON "income_sources" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "income_source_schedules_tenant_app_idx" ON "income_source_schedules" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "income_events_tenant_app_idx" ON "income_events" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "allocation_plans_tenant_app_idx" ON "allocation_plans" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "allocation_plan_lines_tenant_app_idx" ON "allocation_plan_lines" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "shortfall_events_tenant_app_idx" ON "shortfall_events" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "savings_reconciliations_tenant_app_idx" ON "savings_reconciliations" ("tenant_id", "app_id");
CREATE INDEX IF NOT EXISTS "transaction_ledger_tenant_app_idx" ON "transaction_ledger" ("tenant_id", "app_id");

CREATE INDEX IF NOT EXISTS "income_events_expected_date_idx" ON "income_events" ("income_source_id", "expected_date");
CREATE INDEX IF NOT EXISTS "allocation_plan_lines_plan_idx" ON "allocation_plan_lines" ("plan_id");
CREATE INDEX IF NOT EXISTS "transaction_ledger_cat_date_idx" ON "transaction_ledger" ("category_id", "recorded_at" DESC);
CREATE INDEX IF NOT EXISTS "shortfall_events_active_idx" ON "shortfall_events" ("status") WHERE "status" != 'REPAID';

-- 2. Row Level Security Policies (Enforcing Tenant + App Isolation Bounds)
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "income_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "income_source_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "income_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "allocation_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "allocation_plan_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shortfall_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_ledger" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_households ON "households"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_tenant_users ON "tenant_users"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_bank_accounts ON "bank_accounts"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_categories ON "categories"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_category_schedules ON "category_schedules"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_income_sources ON "income_sources"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_income_source_schedules ON "income_source_schedules"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_income_events ON "income_events"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_allocation_plans ON "allocation_plans"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_allocation_plan_lines ON "allocation_plan_lines"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_shortfall_events ON "shortfall_events"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_savings_reconciliations ON "savings_reconciliations"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);

CREATE POLICY tenant_isolation_transaction_ledger ON "transaction_ledger"
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND app_id = NULLIF(current_setting('app.current_app_id', true), '')::uuid);
