-- Creates the app_categories table for app-level category templates.
-- These are copied into the categories table when a new tenant is created.

CREATE TABLE IF NOT EXISTS "app_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" "category_type_enum" NOT NULL,
  "icon" varchar(50),
  "colour" varchar(7),
  "annualised_amount" numeric(12, 2),
  "is_surplus_target" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid NOT NULL
);

-- Index for fast lookup by app
CREATE INDEX IF NOT EXISTS "app_categories_app_id_idx" ON "app_categories" ("app_id");

-- Seed Money Matters default Australian family categories
-- App ID: 01908bde-34bb-7b19-a178-574211bc93aa (hardcoded Money Matters app)
-- System user ID: 00000000-0000-0000-0000-000000000001 (seed user)
INSERT INTO "app_categories" ("id", "app_id", "name", "type", "icon", "annualised_amount", "is_surplus_target", "created_by", "updated_by") VALUES
  -- REGULAR bills
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Mortgage / Rent',              'REGULAR', '🏡', 26400.00, false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Electricity',                  'REGULAR', '⚡', 1800.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Gas',                          'REGULAR', '🔥', 720.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Water',                        'REGULAR', '💧', 840.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Council Rates',                'REGULAR', '🏛️', 2040.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Home & Contents Insurance',   'REGULAR', '🛡️', 1800.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Car Insurance',                'REGULAR', '🚗', 1440.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Car Registration',             'REGULAR', '📋', 840.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Private Health Insurance',     'REGULAR', '🏥', 3360.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Internet',                     'REGULAR', '📡', 960.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Mobile Phone(s)',              'REGULAR', '📱', 720.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Streaming Services',           'REGULAR', '📺', 480.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'School Fees',                  'REGULAR', '🎓', 6000.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Childcare / After School',     'REGULAR', '👶', 9600.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Gym / Sports Membership',      'REGULAR', '💪', 720.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  -- GOAL categories
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Surplus & Offset Reserve',     'GOAL',    '🏦', NULL,     true,  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Emergency Fund',               'GOAL',    '🆘', 2400.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Car Replacement Fund',         'GOAL',    '🚙', 1800.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Holiday Fund',                 'GOAL',    '✈️', 1200.00,  false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Christmas / Birthdays',        'GOAL',    '🎄', 960.00,   false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  -- EVERYDAY category
  (gen_random_uuid(), '01908bde-34bb-7b19-a178-574211bc93aa', 'Everyday Spending',            'EVERYDAY','💳', NULL,     false, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

