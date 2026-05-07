import { createServiceClient } from '@/lib/supabase/server';
import { sendSMS, buildMoveOutSMS } from '@/lib/africas-talking';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tenantId } = await request.json();
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required.' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('full_name, phone_number')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    const message = buildMoveOutSMS(tenant.full_name);
    const smsResult = await sendSMS(tenant.phone_number, message);

    await supabase.from('sms_logs').insert({
      tenant_id: tenantId,
      phone_number: tenant.phone_number,
      message,
      message_type: 'custom',
      status: smsResult.success ? 'sent' : 'failed',
      at_message_id: smsResult.messageId ?? null,
    });

    return NextResponse.json({ success: true, sms_sent: smsResult.success });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
