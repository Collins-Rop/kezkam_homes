-- Add security_bill to apartments
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS security_bill DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add security_paid to payments
-- First drop the generated total_paid column, add security_paid, then recreate total_paid
ALTER TABLE payments
  DROP COLUMN IF EXISTS total_paid;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS security_paid DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE payments
  ADD COLUMN total_paid DECIMAL(10,2) GENERATED ALWAYS AS (rent_paid + water_paid + garbage_paid + security_paid) STORED;
