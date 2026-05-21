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
      security_paid,
      deposit_paid,
      payment_date,
      payment_method,
      reference_number,
      notes,
      mpesa_message,
      entry_mode = 'replace_summary',
      send_sms = true,
    } = body;

    if (!tenant_id || !apartment_id || !payment_month) {
      return NextResponse.json(
        { error: 'tenant_id, apartment_id and payment_month are required.' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const normalizedEntryMode =
      entry_mode === 'add_transaction' ? 'add_transaction' : 'replace_summary';
    const transactionAmounts = {
      rent_paid: Number(rent_paid ?? 0),
      water_paid: Number(water_paid ?? 0),
      garbage_paid: Number(garbage_paid ?? 0),
      security_paid: Number(security_paid ?? 0),
      deposit_paid: Number(deposit_paid ?? 0),
    };

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('payment_month', payment_month)
      .maybeSingle();

    const shouldAddToExisting = normalizedEntryMode === 'add_transaction' && !!existingPayment;
    const summaryAmounts = shouldAddToExisting
      ? {
          rent_paid: Number(existingPayment.rent_paid ?? 0) + transactionAmounts.rent_paid,
          water_paid: Number(existingPayment.water_paid ?? 0) + transactionAmounts.water_paid,
          garbage_paid: Number(existingPayment.garbage_paid ?? 0) + transactionAmounts.garbage_paid,
          security_paid: Number(existingPayment.security_paid ?? 0) + transactionAmounts.security_paid,
          deposit_paid: Number(existingPayment.deposit_paid ?? 0) + transactionAmounts.deposit_paid,
        }
      : transactionAmounts;

    // Upsert — allows correcting a payment within the same month
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .upsert(
        {
          tenant_id,
          apartment_id,
          payment_month,
          rent_paid: summaryAmounts.rent_paid,
          water_paid: summaryAmounts.water_paid,
          garbage_paid: summaryAmounts.garbage_paid,
          security_paid: summaryAmounts.security_paid,
          deposit_paid: summaryAmounts.deposit_paid,
          payment_method: payment_method ?? 'M-Pesa',
          reference_number: reference_number ?? null,
          notes: notes ?? null,
          mpesa_message: mpesa_message ?? null,
          payment_date: payment_date ?? new Date().toISOString(),
        },
        { onConflict: 'tenant_id,payment_month' }
      )
      .select()
      .single();

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 400 });
    }

    const { error: txErr } = await supabase.from('payment_transactions').insert({
      payment_id: payment.id,
      tenant_id,
      apartment_id,
      payment_month,
      ...transactionAmounts,
      transaction_date: payment_date ?? new Date().toISOString(),
      payment_method: payment_method ?? 'M-Pesa',
      reference_number: reference_number ?? null,
      notes: notes ?? null,
      mpesa_message: mpesa_message ?? null,
      entry_mode: normalizedEntryMode,
    });

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 400 });
    }

    // Fetch tenant for SMS
    const { data: tenant } = await supabase
      .from('tenants')
      .select('full_name, phone_number')
      .eq('id', tenant_id)
      .single();

    let smsSent = false;

    if (tenant && send_sms) {
      const monthLabel = format(parseISO(payment_month), 'MMMM yyyy');
      const message = buildConfirmationSMS({
        tenantName: tenant.full_name,
        month: monthLabel,
        rent: transactionAmounts.rent_paid,
        water: transactionAmounts.water_paid,
        garbage: transactionAmounts.garbage_paid,
        security: transactionAmounts.security_paid,
        deposit: transactionAmounts.deposit_paid,
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
        error_message: smsResult.error ?? null,
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
