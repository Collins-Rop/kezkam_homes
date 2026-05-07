import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/utils';

interface TenantRow {
  full_name: string;
  phone_number: string;
  apartment_name: string;
  move_in_date?: string;
}

export async function POST(request: Request) {
  try {
    const { tenants }: { tenants: TenantRow[] } = await request.json();

    if (!Array.isArray(tenants) || tenants.length === 0) {
      return NextResponse.json({ error: 'No tenants provided.' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Look up all apartments once
    const { data: apartments, error: aptErr } = await supabase
      .from('apartments')
      .select('id, name');
    if (aptErr) {
      return NextResponse.json({ error: aptErr.message }, { status: 500 });
    }

    const aptMap = new Map(
      (apartments ?? []).map((a) => [a.name.toLowerCase().trim(), a.id]),
    );

    let created = 0;
    const errors: string[] = [];

    for (const row of tenants) {
      if (!row.full_name || !row.phone_number || !row.apartment_name) {
        errors.push(`Skipped "${row.full_name || 'unnamed'}": missing required fields.`);
        continue;
      }

      const apartmentId = aptMap.get(row.apartment_name.toLowerCase().trim());
      if (!apartmentId) {
        errors.push(
          `Skipped "${row.full_name}": apartment "${row.apartment_name}" not found.`,
        );
        continue;
      }

      const { error: insertErr } = await supabase.from('tenants').insert({
        apartment_id: apartmentId,
        full_name: row.full_name.trim(),
        phone_number: normalizePhone(row.phone_number.trim()),
        move_in_date: row.move_in_date ?? new Date().toISOString().split('T')[0],
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
