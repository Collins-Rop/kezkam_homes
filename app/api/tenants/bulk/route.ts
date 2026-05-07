import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/utils';

interface TenantRow {
  full_name: string;
  phone_number: string;
  unit_name: string;
  move_in_date?: string;
  deposit_amount?: string;
}

export async function POST(request: Request) {
  try {
    const { tenants, building_id }: { tenants: TenantRow[]; building_id?: string } =
      await request.json();

    if (!Array.isArray(tenants) || tenants.length === 0) {
      return NextResponse.json({ error: 'No tenants provided.' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Look up apartments — scoped to building if provided
    let aptQuery = supabase.from('apartments').select('id, name, building_id');
    if (building_id) {
      aptQuery = aptQuery.eq('building_id', building_id);
    }

    const { data: apartments, error: aptErr } = await aptQuery;
    if (aptErr) {
      return NextResponse.json({ error: aptErr.message }, { status: 500 });
    }

    const aptMap = new Map(
      (apartments ?? []).map((a) => [a.name.toLowerCase().trim(), a.id]),
    );

    let created = 0;
    const errors: string[] = [];

    for (const row of tenants) {
      const unitNameKey = (row.unit_name ?? '').toLowerCase().trim();
      if (!row.full_name || !row.phone_number || !unitNameKey) {
        errors.push(`Skipped "${row.full_name || 'unnamed'}": missing required fields.`);
        continue;
      }

      // Try exact match first, then ilike via the map
      let apartmentId = aptMap.get(unitNameKey);

      // If not found via map, try a case-insensitive DB lookup
      if (!apartmentId && building_id) {
        const { data: found } = await supabase
          .from('apartments')
          .select('id')
          .eq('building_id', building_id)
          .ilike('name', row.unit_name)
          .limit(1)
          .maybeSingle();
        apartmentId = found?.id;
      }

      if (!apartmentId) {
        errors.push(
          `Skipped "${row.full_name}": unit "${row.unit_name}" not found${building_id ? ' in selected building' : ''}.`,
        );
        continue;
      }

      const deposit = row.deposit_amount ? parseFloat(row.deposit_amount) : 0;

      const { error: insertErr } = await supabase.from('tenants').insert({
        apartment_id: apartmentId,
        full_name: row.full_name.trim(),
        phone_number: normalizePhone(row.phone_number.trim()),
        move_in_date: row.move_in_date ?? new Date().toISOString().split('T')[0],
        deposit_amount: isNaN(deposit) ? 0 : deposit,
        is_active: true,
      });

      if (insertErr) {
        errors.push(`Failed to add "${row.full_name}": ${insertErr.message}`);
      } else {
        created++;
      }
    }

    return NextResponse.json({ created, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
