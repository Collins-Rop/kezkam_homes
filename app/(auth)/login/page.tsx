'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';

// Maps a plain username to the internal email used with Supabase Auth
function toEmail(username: string): string {
  if (username.includes('@')) return username;
  return `${username.trim().toLowerCase()}@kezkamhomes.app`;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    setLoading(false);
    if (error) {
      setError('Invalid username or password.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function handleSetup() {
    setSetupLoading(true);
    setSetupMsg('');
    try {
      const res = await fetch('/api/auth/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSetupMsg('Admin account created! You can now sign in with username "admin".');
        setUsername('admin');
      } else if (data.message) {
        setSetupMsg(data.message);
      } else {
        setSetupMsg(data.error ?? 'Setup failed.');
      }
    } catch {
      setSetupMsg('Setup failed — check server logs.');
    }
    setSetupLoading(false);
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <img
            src="https://kezkamhomes.com/wp-content/uploads/2026/03/cropped-kez-removebg-preview-2-2-1-270x270.webp"
            alt="Kezkam Homes"
            className="w-16 h-16 object-contain rounded-2xl"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div
            className="w-16 h-16 rounded-2xl items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-brand)', display: 'none' }}
          >
            <Building2 size={28} className="text-white" />
          </div>
        </div>
        <h1
          className="text-2xl font-bold tracking-widest"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)' }}
        >
          KEZKAM HOMES
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Property Management System
        </p>
      </div>

      {/* Card */}
      <div className="card">
        <h2
          className="text-lg font-semibold mb-6"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Sign in to your account
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="admin"
              required
              autoFocus
              autoComplete="username"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                style={{ color: 'var(--color-text-subtle)' }}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center py-2.5"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
          </button>
        </form>

        {/* First-time setup */}
        <div
          className="mt-5 pt-5"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p className="text-xs mb-3 text-center" style={{ color: 'var(--color-text-subtle)' }}>
            First time? Create the admin account below.
          </p>
          <button
            type="button"
            onClick={handleSetup}
            className="btn-secondary w-full justify-center text-xs"
            disabled={setupLoading}
          >
            {setupLoading ? <Loader2 size={13} className="animate-spin" /> : 'Create admin account'}
          </button>
          {setupMsg && (
            <p
              className="text-xs mt-2 text-center"
              style={{ color: setupMsg.includes('created') ? '#15803d' : 'var(--color-text-muted)' }}
            >
              {setupMsg}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-subtle)' }}>
        &copy; {new Date().getFullYear()} Kezkam Homes Limited
      </p>
    </div>
  );
}
