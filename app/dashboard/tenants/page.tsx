import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { FLOOR_OPTIONS } from '@/lib/supabase/types';
import Link from 'next/link';
import { Users, UserX } from 'lucide-react';
import ImportTenantsModal from '@/components/tenants/ImportTenantsModal';

export const dynamic = 'force-dynamic';

const FLOOR_ORDER = ['Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const FLOOR_LABELS: Record<string, string> = Object.fromEntries(
  FLOOR_OPTIONS.map((f) => [f.value, f.label])
);

export default async function TenantsPage() {
  const supabase = createClient();

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, apartments(name, floor, building_id)')
    .eq('is_active', true)
    .order('full_name');

  const { data: pastTenants } = await supabase
    .from('tenants')
    .select('*, apartments(name)')
    .eq('is_active', false)
    .order('move_out_date', { ascending: false })
    .limit(20);

  // Group active tenants by floor
  const byFloor: Record<string, typeof tenants> = {};
  for (const t of tenants ?? []) {
    const floor = (t.apartments as { floor?: string | null } | null)?.floor ?? 'Unknown';
    if (!byFloor[floor]) byFloor[floor] = [];
    byFloor[floor]!.push(t);
  }

  // Sort floors in logical order; unknowns go last
  const sortedFloors = Object.keys(byFloor).sort((a, b) => {
    const ai = FLOOR_ORDER.indexOf(a);
    const bi = FLOOR_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {tenants?.length ?? 0} active tenants
          </p>
        </div>
        <ImportTenantsModal />
      </div>

      {/* Active — grouped by floor */}
      {(tenants?.length ?? 0) > 0 ? (
        <div className="space-y-4">
          {sortedFloors.map((floor) => {
            const floorTenants = byFloor[floor] ?? [];
            const floorLabel = FLOOR_LABELS[floor] ?? floor;
            return (
              <div key={floor} className="card">
                <h2
                  className="font-semibold mb-4 pb-3 text-sm uppercase tracking-wide"
                  style={{
                    fontFamily: 'var(--font-display)',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-brand)',
                  }}
                >
                  {floorLabel} · {floorTenants.length} tenant{floorTenants.length !== 1 ? 's' : ''}
                </h2>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Unit</th>
                      <th>Since</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {floorTenants.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                              style={{ background: 'rgba(212,133,26,0.15)', color: 'var(--color-brand)' }}
                            >
                              {t.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{t.full_name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{t.phone_number}</td>
                        <td>
                          {t.apartment_id ? (
                            <Link
                              href={`/dashboard/apartments/${(t.apartments as { building_id?: string | null } | null)?.building_id ?? ''}/${t.apartment_id}`}
                              className="text-sm hover:underline"
                              style={{ color: 'var(--color-brand-light)' }}
                            >
                              {(t.apartments as { name: string } | null)?.name ?? '—'}
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(t.move_in_date)}</td>
                        <td>
                          <Link
                            href={`/dashboard/tenants/${t.id}`}
                            className="text-xs"
                            style={{ color: 'var(--color-brand)' }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="text-center py-12">
            <Users size={36} style={{ color: 'var(--color-text-subtle)' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No active tenants. Add tenants via an apartment page.
            </p>
          </div>
        </div>
      )}

      {/* Past tenants */}
      {pastTenants && pastTenants.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Past Tenants
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Apartment</th>
                <th>Moved Out</th>
              </tr>
            </thead>
            <tbody>
              {pastTenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <UserX size={14} style={{ color: 'var(--color-text-subtle)' }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>{t.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-subtle)' }}>{t.phone_number}</td>
                  <td style={{ color: 'var(--color-text-subtle)' }}>
                    {(t.apartments as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-subtle)' }}>
                    {t.move_out_date ? formatDate(t.move_out_date) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
