import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'kimutai1136@gmail.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'kezkam@2026';

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey === 'your_supabase_service_role_key') {
    return NextResponse.json(
      { error: 'Service role key not configured. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' },
      { status: 503 }
    );
  }

  try {
    const supabase = createServiceClient();

    // Check if admin already exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminExists = users?.some((u) => u.email === ADMIN_EMAIL);

    if (adminExists) {
      return NextResponse.json({ message: 'Admin account already exists. Sign in with username "admin".' });
    }

    const { error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { username: ADMIN_USERNAME },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Setup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
