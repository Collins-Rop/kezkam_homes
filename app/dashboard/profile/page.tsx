'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserCircle, LogOut, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwLoading(true);
    const supabase = createClient();

    // Re-authenticate with current password first
    const email = user?.email ?? '';
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });

    if (signInError) {
      setPwError('Current password is incorrect.');
      setPwLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  const displayName = user.email?.split('@')[0] ?? 'User';

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Account settings
        </p>
      </div>

      {/* Account info */}
      <div className="card space-y-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: 'rgba(176,138,36,0.12)', color: 'var(--color-brand)' }}
          >
            {(user.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {user.email}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Kezkam Homes Staff
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)' }} className="pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <UserCircle size={16} style={{ color: 'var(--color-text-subtle)' }} />
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>
                Email
              </p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4" />
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>
                Last sign in
              </p>
              <p className="text-sm">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString('en-KE', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={16} style={{ color: 'var(--color-brand)' }} />
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Change Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="input"
              placeholder="Min. 8 characters"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          {pwError && (
            <p className="text-sm" style={{ color: '#dc2626' }}>{pwError}</p>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#15803d' }}>
              <CheckCircle size={14} />
              Password updated successfully.
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={pwLoading}
          >
            {pwLoading ? <Loader2 size={14} className="animate-spin" /> : 'Update password'}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="card">
        <h2 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Sign out
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          You will be redirected to the login page.
        </p>
        <button
          onClick={handleLogout}
          className="btn-danger"
          disabled={loggingOut}
        >
          <LogOut size={15} />
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
