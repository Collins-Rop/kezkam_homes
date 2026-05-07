-- Kezkam Homes - Initial Schema
-- Run this in your Supabase SQL Editor or via supabase db push

-- ─────────────────────────────────────────────
-- APARTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  floor TEXT,
  description TEXT,
  rent_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  water_bill DECIMAL(10,2) NOT NULL DEFAULT 0,
  garbage_bill DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  national_id TEXT,
  email TEXT,
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  rent_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  water_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  garbage_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(10,2) GENERATED ALWAYS AS (rent_paid + water_paid + garbage_paid) STORED,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'M-Pesa',
  reference_number TEXT,
  notes TEXT,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, payment_month)
);

-- ─────────────────────────────────────────────
-- SMS LOGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('reminder', 'confirmation', 'custom')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  at_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_apartment ON tenants(apartment_id);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_apartment ON payments(apartment_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(payment_month);
CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant ON sms_logs(tenant_id);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apartments_updated_at
  BEFORE UPDATE ON apartments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- AUTO-UPDATE apartment occupancy
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_apartment_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  target_apt_id UUID;
BEGIN
  target_apt_id := COALESCE(NEW.apartment_id, OLD.apartment_id);
  IF target_apt_id IS NOT NULL THEN
    UPDATE apartments
    SET is_occupied = EXISTS (
      SELECT 1 FROM tenants
      WHERE apartment_id = target_apt_id
        AND is_active = true
    )
    WHERE id = target_apt_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_occupancy_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_apartment_occupancy();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (enable after adding auth)
-- ─────────────────────────────────────────────
-- ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Uncomment these once you set up Supabase Auth:
-- CREATE POLICY "Authenticated users can do everything on apartments"
--   ON apartments FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (Repeat for other tables)
