CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan text NOT NULL,
  billing_cycle text NOT NULL,
  payment_method text NOT NULL,
  provider text NOT NULL,
  provider_subscription_id text,
  status text NOT NULL DEFAULT 'pending',
  amount integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_user" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_payment_id text,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_user" ON payments
  FOR ALL USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE user_id = auth.uid())
  );
