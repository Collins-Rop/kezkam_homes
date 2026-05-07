import { createServiceClient } from '@/lib/supabase/server';
import { sendSMS, buildReminderSMS } from '@/lib/africas-talking';
import { NextResponse } from 'next/server';
import { format, addMonths, startOfMonth } from 'date-fns';

// This route is called by Vercel Cron on the 28th of every month at 08:00 EAT
// vercel.json: { "crons": [{ "path": "/api/reminders", "schedule": "0 5 28 * *" }] }
// Note: Vercel cron runs in UTC — 05:00 UTC = 08:00 EAT

type ReminderApartment = {
  rent_amount: number;
  water_bill: number;
  garbage_bill: number;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET(request: Request) {
  // Validate cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Remind tenants about NEXT month's bill
  const nextMonth = startOfMonth(addMonths(new Date(), 1));
  const monthLabel = format(nextMonth, 'MMMM yyyy');

  // Fetch all active tenants with their apartments
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, full_name, phone_number, apartments(rent_amount, water_bill, garbage_bill)')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, message: 'No active tenants.' });
  }

  let sent = 0;
  let failed = 0;
  const results: { tenant: string; status: string }[] = [];

  for (const tenant of tenants) {
    const apt = firstRelation(tenant.apartments) as ReminderApartment | null;

    if (!apt) {
      results.push({ tenant: tenant.full_name, status: 'skipped — no apartment' });
      continue;
    }

    const message = buildReminderSMS({
      tenantName: tenant.full_name,
      month: monthLabel,
      rent: apt.rent_amount,
      water: apt.water_bill,
      garbage: apt.garbage_bill,
    });

    const smsResult = await sendSMS(tenant.phone_number, message);

    await supabase.from('sms_logs').insert({
      tenant_id: tenant.id,
      phone_number: tenant.phone_number,
      message,
      message_type: 'reminder',
      status: smsResult.success ? 'sent' : 'failed',
      at_message_id: smsResult.messageId ?? null,
    });

    if (smsResult.success) {
      sent++;
      results.push({ tenant: tenant.full_name, status: 'sent' });
    } else {
      failed++;
      results.push({ tenant: tenant.full_name, status: `failed: ${smsResult.error}` });
    }
  }

  return NextResponse.json({
    success: true,
    month: monthLabel,
    total: tenants.length,
    sent,
    failed,
    results,
  });
}
