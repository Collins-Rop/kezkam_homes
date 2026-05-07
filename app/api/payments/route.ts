import { createServiceClient } from '@/lib/supabase/server';
import { sendSMS, buildConfirmationSMS } from '@/lib/africas-talking';
import { NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      apartment_id,
      payment_month,
      rent_paid,
      water_paid,
      garbage_paid,
      payment_method,
      reference_number,
      notes,
    } = body;

    if (!tenant_id || !apartment_id || !payment_month) {
      return NextResponse.json(
        { error: 'tenant_id, apartment_id and payment_month are required.' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Upsert — allows correcting a payment within the same month
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .upsert(
        {
          tenant_id,
          apartment_id,
          payment_month,
          rent_paid: rent_paid ?? 0,
          water_paid: water_paid ?? 0,
          garbage_paid: garbage_paid ?? 0,
          payment_method: payment_method ?? 'M-Pesa',
          reference_number: reference_number ?? null,
          notes: notes ?? null,
          payment_date: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,payment_month' }
      )
      .select()
      .single();

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 400 });
    }

    // Fetch tenant for SMS
    const { data: tenant } = await supabase
      .from('tenants')
      .select('full_name, phone_number')
      .eq('id', tenant_id)
      .single();

    let smsSent = false;

    if (tenant) {
      const monthLabel = format(parseISO(payment_month), 'MMMM yyyy');
      const message = buildConfirmationSMS({
        tenantName: tenant.full_name,
        month: monthLabel,
        rent: rent_paid ?? 0,
        water: water_paid ?? 0,
        garbage: garbage_paid ?? 0,
        referenceNumber: reference_number ?? undefined,
      });

      const smsResult = await sendSMS(tenant.phone_number, message);

      // Log the SMS
      await supabase.from('sms_logs').insert({
        tenant_id,
        phone_number: tenant.phone_number,
        message,
        message_type: 'confirmation',
        status: smsResult.success ? 'sent' : 'failed',
        at_message_id: smsResult.messageId ?? null,
      });

      if (smsResult.success) {
        smsSent = true;
        await supabase.from('payments').update({ sms_sent: true }).eq('id', payment.id);
      }
    }

    return NextResponse.json({ success: true, payment, sms_sent: smsSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const apartment = searchParams.get('apartment');

  const supabase = createServiceClient();
  let query = supabase
    .from('payments')
    .select('*, tenants(full_name, phone_number), apartments(name)')
    .order('payment_date', { ascending: false });

  if (month) query = query.eq('payment_month', month);
  if (apartment) query = query.eq('apartment_id', apartment);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ payments: data });
}
