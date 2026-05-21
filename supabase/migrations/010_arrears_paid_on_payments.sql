-- Track payments made toward arrears as a first-class payment line item.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS arrears_paid DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE payments DROP COLUMN IF EXISTS total_paid;
ALTER TABLE payments ADD COLUMN total_paid DECIMAL(10,2)
  GENERATED ALWAYS AS (
    rent_paid + water_paid + garbage_paid + security_paid + deposit_paid + arrears_paid
  ) STORED;

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS arrears_paid DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE payment_transactions DROP COLUMN IF EXISTS total_paid;
ALTER TABLE payment_transactions ADD COLUMN total_paid DECIMAL(10,2)
  GENERATED ALWAYS AS (
    rent_paid + water_paid + garbage_paid + security_paid + deposit_paid + arrears_paid
  ) STORED;
