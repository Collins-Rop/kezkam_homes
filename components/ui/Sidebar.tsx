'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  LogOut,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/apartments', label: 'Buildings', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/sms', label: 'SMS Logs', icon: MessageSquare },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
];

interface SidebarProps {
  username: string;
}

export default function Sidebar({ username }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const navContent = (
    <>
      {/* Logo */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <img
          src="https://kezkamhomes.com/wp-content/uploads/2026/03/cropped-kez-removebg-preview-2-2-1-270x270.webp"
          alt="Kezkam Homes"
          className="w-9 h-9 object-contain rounded-lg flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (next) next.style.display = 'flex';
          }}
        />
        <div
          className="w-9 h-9 rounded-lg items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-brand)', display: 'none' }}
        >
          <Building2 size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold leading-tight tracking-wide truncate"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-brand)',
              fontSize: '1rem',
              letterSpacing: '0.06em',
            }}
          >
            KEZKAM
          </div>
          <div
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em', fontSize: '0.6rem' }}
          >
            Homes Limited
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav section label */}
      <div className="px-5 pt-5 pb-2">
        <span
          className="text-xs uppercase tracking-widest font-medium"
          style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.1em' }}
        >
          Management
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150',
              )}
              style={
                active
                  ? {
                      background: 'rgba(201,168,76,0.12)',
                      color: 'var(--color-brand)',
                      fontWeight: 500,
                      borderLeft: '2px solid var(--color-brand)',
                    }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <Icon
                size={18}
                style={{ color: active ? 'var(--color-brand)' : 'var(--color-text-subtle)' }}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight size={14} style={{ color: 'var(--color-brand)', opacity: 0.6 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div
        className="p-3 space-y-1"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Link
          href="/dashboard/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
          )}
          style={
            pathname === '/dashboard/profile'
              ? {
                  background: 'rgba(201,168,76,0.12)',
                  color: 'var(--color-brand)',
                  fontWeight: 500,
                  borderLeft: '2px solid var(--color-brand)',
                }
              : { color: 'var(--color-text-muted)' }
          }
        >
          <UserCircle
            size={18}
            style={{
              color: pathname === '/dashboard/profile' ? 'var(--color-brand)' : 'var(--color-text-subtle)',
            }}
          />
          <span className="flex-1 capitalize">{username}</span>
        </Link>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all duration-150"
          style={{ color: '#b91c1c' }}
        >
          <LogOut size={18} style={{ color: '#dc2626', opacity: 0.7 }} />
          <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>

        <p className="text-xs px-3 pt-1" style={{ color: 'var(--color-text-subtle)' }}>
          &copy; {new Date().getFullYear()} Kezkam Homes Ltd
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4"
        style={{
          height: '56px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(28,43,64,0.06)',
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <img
            src="https://kezkamhomes.com/wp-content/uploads/2026/03/cropped-kez-removebg-preview-2-2-1-270x270.webp"
            alt="Kezkam"
            className="w-7 h-7 object-contain rounded-md"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-brand)',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.05em',
            }}
          >
            KEZKAM HOMES
          </span>
        </div>
      </header>

      {/* ── Mobile overlay backdrop ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 lg:w-60 flex flex-col z-50',
          'transition-transform duration-250 ease-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {navContent}
      </aside>
    </>
  );
}
