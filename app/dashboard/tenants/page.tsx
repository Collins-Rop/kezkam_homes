import { createClient } from '@/lib/supabase/server';
import { FLOOR_OPTIONS } from '@/lib/supabase/types';
import { Users, UserX } from 'lucide-react';
import ImportTenantsModal from '@/components/tenants/ImportTenantsModal';
import TenantBuildingGroups, {
  type TenantBuildingGroup,
  type TenantListItem,
} from '@/components/tenants/TenantBuildingGroups';

export const dynamic = 'force-dynamic';

const FLOOR_ORDER = ['Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const FLOOR_LABELS: Record<string, string> = Object.fromEntries(
  FLOOR_OPTIONS.map((f) => [f.value, f.label])
);

export default async function TenantsPage() {
  const supabase = createClient();

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, apartments(name, floor, building_id, buildings(id, name))')
    .eq('is_active', true)
    .order('full_name');

  const { data: pastTenants } = await supabase
    .from('tenants')
    .select('*, apartments(name)')
    .eq('is_active', false)
    .order('move_out_date', { ascending: false })
    .limit(20);

  type TenantRow = NonNullable<typeof tenants>[number];
  type ApartmentInfo = {
    name?: string | null;
    floor?: string | null;
    building_id?: string | null;
    buildings?: { id?: string | null; name?: string | null } | null;
  };

  // Group active tenants by building, then by floor inside each building.
  const byBuilding = new Map<
    string,
    {
      name: string;
      floors: Map<string, TenantRow[]>;
      tenantCount: number;
    }
  >();

  for (const t of tenants ?? []) {
    const apartment = t.apartments as ApartmentInfo | null;
    const buildingId = apartment?.building_id ?? '__none__';
    const buildingName = apartment?.buildings?.name ?? 'No Building';
    const floor = apartment?.floor ?? 'Unknown';

    if (!byBuilding.has(buildingId)) {
      byBuilding.set(buildingId, {
        name: buildingName,
        floors: new Map(),
        tenantCount: 0,
      });
    }

    const building = byBuilding.get(buildingId)!;
    const floorTenants = building.floors.get(floor) ?? [];
    floorTenants.push(t);
    building.floors.set(floor, floorTenants);
    building.tenantCount++;
  }

  function sortFloors(a: string, b: string) {
    const ai = FLOOR_ORDER.indexOf(a);
    const bi = FLOOR_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }

  const sortedBuildings = Array.from(byBuilding.entries()).sort(([, a], [, b]) => {
    if (a.name === 'No Building') return 1;
    if (b.name === 'No Building') return -1;
    return a.name.localeCompare(b.name);
  });
  const tenantBuildings: TenantBuildingGroup[] = sortedBuildings.map(([buildingId, building]) => ({
    id: buildingId,
    name: building.name,
    tenantCount: building.tenantCount,
    floors: Array.from(building.floors.entries())
      .sort(([a], [b]) => sortFloors(a, b))
      .map(([floor, floorTenants]) => ({
        floor,
        label: FLOOR_LABELS[floor] ?? floor,
        tenants: floorTenants.map((tenant): TenantListItem => {
          const apartment = tenant.apartments as ApartmentInfo | null;
          return {
            id: tenant.id,
            full_name: tenant.full_name,
            phone_number: tenant.phone_number,
            move_in_date: tenant.move_in_date,
            apartment_id: tenant.apartment_id,
            apartment_name: apartment?.name ?? null,
            building_id: apartment?.building_id ?? null,
          };
        }),
      })),
  }));

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

      {/* Active — grouped by building */}
      {(tenants?.length ?? 0) > 0 ? (
        <TenantBuildingGroups buildings={tenantBuildings} />
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
                    {t.move_out_date
                      ? new Date(t.move_out_date).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
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
