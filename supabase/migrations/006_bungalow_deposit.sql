-- Add new unit types: bungalow, mansionette, own_compound
ALTER TABLE apartments DROP CONSTRAINT IF EXISTS apartments_unit_type_check;
ALTER TABLE apartments ADD CONSTRAINT apartments_unit_type_check
  CHECK (unit_type IN (
    'single_room', 'double_room', 'shop',
    'bedsitter', '1br', '2br',
    'bungalow', 'mansionette', 'own_compound'
  ));

-- Add deposit_paid column to payments and include it in total_paid
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deposit_paid DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Recreate total_paid generated column to include deposit_paid
ALTER TABLE payments DROP COLUMN IF EXISTS total_paid;
ALTER TABLE payments ADD COLUMN total_paid DECIMAL(10,2)
  GENERATED ALWAYS AS (rent_paid + water_paid + garbage_paid + security_paid + deposit_paid) STORED;
