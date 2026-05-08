import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if user already exists (email or username)
    const { data: { users } } = await supabase.auth.admin.listUsers();
    if (users?.some((u) => u.email === email)) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }
    if (users?.some((u) => u.user_metadata?.username === username.toLowerCase())) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 400 });
    }

    // Create user with email confirmed (no verification email needed)
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: username.toLowerCase() },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
