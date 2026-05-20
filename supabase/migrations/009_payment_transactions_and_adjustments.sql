-- Payment transaction history and manual tenant balance adjustments
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  rent_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  water_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  garbage_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  security_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(10,2)
    GENERATED ALWAYS AS (rent_paid + water_paid + garbage_paid + security_paid + deposit_paid) STORED,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'M-Pesa',
  reference_number TEXT,
  notes TEXT,
  mpesa_message TEXT,
  entry_mode TEXT NOT NULL DEFAULT 'add_transaction'
    CHECK (entry_mode IN ('add_transaction', 'replace_summary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment
  ON payment_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_month
  ON payment_transactions(tenant_id, payment_month);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_date
  ON payment_transactions(transaction_date DESC);

CREATE TABLE IF NOT EXISTS tenant_balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
  adjustment_month DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, adjustment_month)
);

CREATE INDEX IF NOT EXISTS idx_tenant_balance_adjustments_tenant_month
  ON tenant_balance_adjustments(tenant_id, adjustment_month);

CREATE TRIGGER tenant_balance_adjustments_updated_at
  BEFORE UPDATE ON tenant_balance_adjustments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payment_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenant_balance_adjustments TO service_role;
GRANT SELECT ON TABLE payment_transactions TO authenticated;
GRANT SELECT ON TABLE tenant_balance_adjustments TO authenticated;
