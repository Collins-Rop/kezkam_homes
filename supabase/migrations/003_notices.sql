-- 003_notices.sql
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  notice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vacate_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  arrears_deducted DECIMAL(10,2) NOT NULL DEFAULT 0,
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_tenant ON notices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notices_apartment ON notices(apartment_id);
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
CREATE TRIGGER notices_updated_at BEFORE UPDATE ON notices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_message TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
