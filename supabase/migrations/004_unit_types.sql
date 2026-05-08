-- Add new unit types: single_room, double_room, shop
-- Drop existing check constraint and recreate with all 6 types

ALTER TABLE apartments
  DROP CONSTRAINT IF EXISTS apartments_unit_type_check;

ALTER TABLE apartments
  ADD CONSTRAINT apartments_unit_type_check
  CHECK (unit_type IN ('single_room', 'double_room', 'shop', 'bedsitter', '1br', '2br'));
