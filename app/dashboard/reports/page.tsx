import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, FileText, BarChart2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = createClient();

  const [{ data: buildings }, { data: tenants }] = await Promise.all([
    supabase.from('buildings').select('*').order('name'),
    supabase
      .from('tenants')
      .select('id, full_name, phone_number, apartment_id, is_active, apartments(name, buildings(name))')
      .eq('is_active', true)
      .order('full_name'),
  ]);

  const allBuildings = buildings ?? [];
  const allTenants = tenants ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Building reports and individual tenant statements
        </p>
      </div>

      {/* Building Reports */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} style={{ color: 'var(--color-brand)' }} />
          <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Building Reports
          </h2>
        </div>

        {allBuildings.length === 0 ? (
          <div className="card text-center py-10">
            <Building2 size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No buildings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBuildings.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/reports/buildings/${b.id}`}
                className="card flex items-center gap-4 hover:opacity-90 transition-opacity"
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(176,138,36,0.1)' }}
                >
                  <Building2 size={20} style={{ color: 'var(--color-brand)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{b.name}</div>
                  {b.description && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {b.description}
                    </div>
                  )}
                </div>
                <BarChart2 size={16} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tenant Statements */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={20} style={{ color: 'var(--color-brand)' }} />
          <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Tenant Statements
          </h2>
        </div>

        {allTenants.length === 0 ? (
          <div className="card text-center py-10">
            <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No active tenants found.</p>
          </div>
        ) : (
          <div className="card overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th>Building</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allTenants.map((t) => {
                  const apt = t.apartments as unknown as { name: string; buildings?: { name: string } | null } | null;
                  return (
                    <tr key={t.id}>
                      <td className="font-medium">{t.full_name}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{apt?.name ?? '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{apt?.buildings?.name ?? '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{t.phone_number}</td>
                      <td>
                        <Link
                          href={`/dashboard/reports/tenants/${t.id}`}
                          className="btn-secondary !px-3 !py-1 !text-xs"
                        >
                          <FileText size={12} /> View Statement
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
