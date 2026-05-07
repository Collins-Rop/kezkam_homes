import { createServiceClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/africas-talking';
import { NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      apartment_id,
      notice_date,
      vacate_date,
      deposit_amount,
      arrears_deducted,
      notes,
    } = body;

    if (!tenant_id || !apartment_id || !vacate_date) {
      return NextResponse.json(
        { error: 'tenant_id, apartment_id and vacate_date are required.' },
        { status: 400 }
      );
    }

    const deposit = deposit_amount ?? 0;
    const arrears = arrears_deducted ?? 0;
    const refund = deposit - arrears;

    const supabase = createServiceClient();

    const { data: notice, error: noticeErr } = await supabase
      .from('notices')
      .insert({
        tenant_id,
        apartment_id,
        notice_date: notice_date ?? new Date().toISOString().split('T')[0],
        vacate_date,
        deposit_amount: deposit,
        arrears_deducted: arrears,
        refund_amount: refund,
        notes: notes ?? null,
        status: 'active',
      })
      .select()
      .single();

    if (noticeErr) {
      return NextResponse.json({ error: noticeErr.message }, { status: 400 });
    }

    // Fetch tenant and unit info for SMS
    const { data: tenant } = await supabase
      .from('tenants')
      .select('full_name, phone_number')
      .eq('id', tenant_id)
      .single();

    const { data: apartment } = await supabase
      .from('apartments')
      .select('name')
      .eq('id', apartment_id)
      .single();

    let smsSent = false;

    if (tenant && apartment) {
      const vacateDateFormatted = format(parseISO(vacate_date), 'dd MMM yyyy');
      const message = `Dear ${tenant.full_name}, Your notice to vacate ${apartment.name} has been received and accepted. Vacate date: ${vacateDateFormatted}. Deposit paid: KES ${deposit.toLocaleString()}. Arrears deducted: KES ${arrears.toLocaleString()}. Refund due: KES ${refund.toLocaleString()}. - Kezkam Homes`;

      const smsResult = await sendSMS(tenant.phone_number, message);

      await supabase.from('sms_logs').insert({
        tenant_id,
        phone_number: tenant.phone_number,
        message,
        message_type: 'custom',
        status: smsResult.success ? 'sent' : 'failed',
        at_message_id: smsResult.messageId ?? null,
      });

      if (smsResult.success) {
        smsSent = true;
        await supabase.from('notices').update({ sms_sent: true }).eq('id', notice.id);
      }
    }

    return NextResponse.json({ success: true, notice, sms_sent: smsSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  const status = searchParams.get('status');

  const supabase = createServiceClient();
  let query = supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  if (tenantId) query = query.eq('tenant_id', tenantId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notices: data });
}
