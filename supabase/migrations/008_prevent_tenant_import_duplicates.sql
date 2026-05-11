-- Deactivate duplicate tenant rows caused by repeated CSV imports.
-- Duplicates are defined conservatively as the same active tenant phone number in the same unit.
-- Rows are not deleted, so any historical payments, SMS logs, or notices remain attached.
CREATE OR REPLACE FUNCTION public.normalize_tenant_phone_for_unique(raw_phone TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT CASE
    WHEN regexp_replace(raw_phone, '\D', '', 'g') ~ '^0[0-9]{9}$' THEN
      '+254' || substring(regexp_replace(raw_phone, '\D', '', 'g') FROM 2)
    WHEN regexp_replace(raw_phone, '\D', '', 'g') ~ '^254[0-9]{9}$' THEN
      '+' || regexp_replace(raw_phone, '\D', '', 'g')
    WHEN regexp_replace(raw_phone, '\D', '', 'g') ~ '^7[0-9]{8}$' THEN
      '+254' || regexp_replace(raw_phone, '\D', '', 'g')
    WHEN regexp_replace(raw_phone, '\D', '', 'g') ~ '^7[0-9]{7}$' THEN
      '+2547' || regexp_replace(raw_phone, '\D', '', 'g')
    ELSE
      lower(trim(raw_phone))
  END
$$;

WITH ranked_duplicates AS (
  SELECT
    tenants.id,
    row_number() OVER (
      PARTITION BY tenants.apartment_id, public.normalize_tenant_phone_for_unique(tenants.phone_number)
      ORDER BY
        COALESCE(payment_counts.payment_count, 0) DESC,
        tenants.updated_at DESC,
        tenants.created_at DESC,
        tenants.id DESC
    ) AS duplicate_rank
  FROM tenants
  LEFT JOIN (
    SELECT tenant_id, count(*) AS payment_count
    FROM payments
    GROUP BY tenant_id
  ) AS payment_counts ON payment_counts.tenant_id = tenants.id
  WHERE is_active = true
    AND tenants.apartment_id IS NOT NULL
    AND nullif(trim(tenants.phone_number), '') IS NOT NULL
)
UPDATE tenants
SET
  is_active = false,
  move_out_date = COALESCE(move_out_date, CURRENT_DATE),
  notes = trim(concat_ws(E'\n', notes, 'Deactivated by duplicate tenant cleanup migration.')),
  updated_at = now()
WHERE id IN (
  SELECT id
  FROM ranked_duplicates
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_active_unit_phone_unique
  ON tenants (apartment_id, public.normalize_tenant_phone_for_unique(phone_number))
  WHERE is_active = true
    AND apartment_id IS NOT NULL;
