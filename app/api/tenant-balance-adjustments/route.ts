import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenant_id, apartment_id, adjustment_month, amount, notes } = body;

    if (!tenant_id || !apartment_id || !adjustment_month) {
      return NextResponse.json(
        { error: 'tenant_id, apartment_id and adjustment_month are required.' },
        { status: 400 },
      );
    }

    const parsedAmount = Number(amount ?? 0);
    if (!Number.isFinite(parsedAmount)) {
      return NextResponse.json(
        { error: 'Carry-forward arrears amount must be a valid number.' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('tenant_balance_adjustments')
      .upsert(
        {
          tenant_id,
          apartment_id,
          adjustment_month,
          amount: parsedAmount,
          notes: notes ?? null,
        },
        { onConflict: 'tenant_id,adjustment_month' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, adjustment: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
