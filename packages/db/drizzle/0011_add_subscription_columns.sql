ALTER TABLE tenants
  ADD COLUMN subscription_status VARCHAR(30) NOT NULL DEFAULT 'TRIAL_ACTIVE',
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN trial_grace_ends_at TIMESTAMPTZ,
  ADD COLUMN stripe_customer_id VARCHAR(255),
  ADD COLUMN stripe_subscription_id VARCHAR(255),
  ADD COLUMN stripe_price_id VARCHAR(255),
  ADD COLUMN subscribed_at TIMESTAMPTZ,
  ADD COLUMN subscription_ends_at TIMESTAMPTZ;

CREATE INDEX idx_tenants_subscription_status ON tenants (subscription_status);
