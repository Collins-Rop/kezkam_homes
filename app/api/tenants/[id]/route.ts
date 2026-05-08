import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { full_name, phone_number, email, national_id, deposit_amount, notes, move_in_date } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!phone_number?.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('tenants')
      .update({
        full_name: full_name.trim(),
        phone_number: phone_number.trim(),
        email: email?.trim() || null,
        national_id: national_id?.trim() || null,
        deposit_amount: deposit_amount ? Number(deposit_amount) : null,
        notes: notes?.trim() || null,
        move_in_date: move_in_date || null,
      })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
