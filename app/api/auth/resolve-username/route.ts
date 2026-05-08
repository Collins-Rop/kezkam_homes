import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.toLowerCase().trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users?.find((u) => u.user_metadata?.username === username);

    if (!user?.email) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ email: user.email });
  } catch {
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
  }
}
