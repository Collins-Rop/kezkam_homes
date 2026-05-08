import { createServiceClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/africas-talking';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { log_id } = await request.json();
    if (!log_id) return NextResponse.json({ error: 'log_id required' }, { status: 400 });

    const supabase = createServiceClient();

    const { data: log } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('id', log_id)
      .single();

    if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 });

    const result = await sendSMS(log.phone_number, log.message);

    await supabase
      .from('sms_logs')
      .update({
        status: result.success ? 'sent' : 'failed',
        at_message_id: result.messageId ?? null,
        error_message: result.error ?? null,
      })
      .eq('id', log_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
