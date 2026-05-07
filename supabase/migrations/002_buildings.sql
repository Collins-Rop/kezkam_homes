-- Migration 002: Buildings structure
-- Run this AFTER 001_initial_schema.sql in Supabase SQL Editor

-- ─────────────────────────────────────────────
-- BUILDINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- ADD BUILDING + UNIT TYPE TO APARTMENTS
-- ─────────────────────────────────────────────
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_type TEXT CHECK (unit_type IN ('bedsitter', '1br', '2br'));

CREATE INDEX IF NOT EXISTS idx_apartments_building ON apartments(building_id);
