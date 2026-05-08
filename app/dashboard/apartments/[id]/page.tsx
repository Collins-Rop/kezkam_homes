import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, BarChart2 } from 'lucide-react';
import { UNIT_TYPE_LABELS, type ApartmentWithTenants, type UnitType } from '@/lib/supabase/types';
import AddUnitModal from '@/components/apartments/AddUnitModal';
import BuildingEditForm from '@/components/apartments/BuildingEditForm';
import { differenceInDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

const UNIT_LABELS = UNIT_TYPE_LABELS;

const FLOOR_ORDER = ['Ground', '1st', '2nd', '3rd', '4th'];

function sortFloor(f: string | null) {
  const idx = FLOOR_ORDER.indexOf(f ?? '');
  return idx === -1 ? 99 : idx;
}

export default async function BuildingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: building }, { data: units }, { data: activeNoticesData }] = await Promise.all([
    supabase.from('buildings').select('*').eq('id', params.id).single(),
    supabase
      .from('apartments')
      .select('*, tenants(id, full_name, is_active)')
      .eq('building_id', params.id)
      .order('name'),
    supabase.from('notices').select('apartment_id, vacate_date').eq('status', 'active'),
  ]);

  if (!building) notFound();

  const allUnits = (units ?? []) as ApartmentWithTenants[];
  const activeNotices = activeNoticesData ?? [];

  // Build a set of apartment IDs with active notices
  const noticeMap = new Map<string, string>(); // apartment_id -> vacate_date
  for (const n of activeNotices) {
    if (n.apartment_id) noticeMap.set(n.apartment_id, n.vacate_date);
  }

  const occupied = allUnits.filter((u) => u.is_occupied).length;
  const noticeCount = allUnits.filter((u) => noticeMap.has(u.id)).length;
  const vacant = allUnits.length - occupied;

  // Earliest vacate date among units in this building
  const buildingNoticeVacates = allUnits
    .filter((u) => noticeMap.has(u.id))
    .map((u) => noticeMap.get(u.id)!)
    .sort();
  const earliestVacate = buildingNoticeVacates[0] ?? null;
  const daysToEarliestVacate = earliestVacate
    ? differenceInDays(parseISO(earliestVacate), new Date())
    : null;

  // Group units by floor
  const floors = Array.from(new Set(allUnits.map((u) => u.floor))).sort(
    (a, b) => sortFloor(a) - sortFloor(b)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/apartments" className="btn-secondary !px-2 !py-2 mt-1">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{building.name}</h1>
            <span className="badge-gray">{allUnits.length} units</span>
            <span className="badge-green">{occupied} occupied</span>
            {noticeCount > 0 && (
              <span className="badge-amber">{noticeCount} on notice</span>
            )}
          </div>
          {building.description && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {building.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/reports/buildings/${params.id}`}
            className="btn-secondary !px-3 !py-1.5 !text-xs"
          >
            <BarChart2 size={14} /> Report
          </Link>
          <AddUnitModal buildingId={building.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Units by floor */}
        <div className="lg:col-span-2 space-y-5">
          {allUnits.length === 0 ? (
            <div className="card text-center py-14">
              <Building2 size={36} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
              <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
                No units yet
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                Use &ldquo;Add Unit&rdquo; to add bedsitters, 1-bed or 2-bed units.
              </p>
            </div>
          ) : (
            floors.map((floor) => {
              const floorUnits = allUnits.filter((u) => u.floor === floor);
              return (
                <div key={floor ?? 'no-floor'} className="card">
                  <h2
                    className="font-semibold mb-4 pb-3 flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--color-border)' }}
                  >
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium"
                      style={{ background: 'rgba(176,138,36,0.1)', color: 'var(--color-brand)' }}
                    >
                      {floor ? `${floor} Floor` : 'Floor not set'}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>
                      {floorUnits.length} unit{floorUnits.length !== 1 ? 's' : ''}
                    </span>
                  </h2>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {floorUnits.map((unit) => {
                      const activeTenants = unit.tenants?.filter((t) => t.is_active) ?? [];
                      const hasNotice = noticeMap.has(unit.id);
                      const vacateDate = noticeMap.get(unit.id);
                      const daysToVacate = vacateDate
                        ? differenceInDays(parseISO(vacateDate), new Date())
                        : null;

                      return (
                        <Link
                          key={unit.id}
                          href={`/dashboard/apartments/${building.id}/${unit.id}`}
                          className="flex items-start justify-between p-4 rounded-xl transition-all duration-150"
                          style={{
                            background: unit.is_occupied
                              ? 'rgba(176,138,36,0.04)'
                              : 'var(--color-surface-2)',
                            border: `1px solid ${unit.is_occupied ? 'rgba(176,138,36,0.18)' : 'var(--color-border)'}`,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{unit.name}</span>
                              {unit.unit_type && (
                                <span className="badge-gray text-xs flex-shrink-0">
                                  {UNIT_LABELS[unit.unit_type]}
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {formatCurrency(unit.rent_amount + unit.water_bill + unit.garbage_bill)} / mo
                            </p>
                            {activeTenants.length > 0 && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-brand)' }}>
                                {activeTenants.map((t) => t.full_name).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                            <span
                              className={unit.is_occupied ? 'badge-green' : 'badge-gray'}
                            >
                              {unit.is_occupied ? 'Occupied' : 'Vacant'}
                            </span>
                            {hasNotice && (
                              <span className="badge-amber text-xs">
                                Notice {daysToVacate !== null ? `(${daysToVacate}d)` : ''}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: summary + edit */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-sm pb-3" style={{ fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--color-border)' }}>
              Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Total units</span>
                <span className="font-medium">{allUnits.length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Occupied (no notice)</span>
                <span className="font-medium" style={{ color: '#15803d' }}>{occupied - noticeCount}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>With notice</span>
                <span className="font-medium" style={{ color: '#b45309' }}>{noticeCount}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Vacant</span>
                <span className="font-medium">{vacant}</span>
              </div>
              {daysToEarliestVacate !== null && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Days to vacate</span>
                  <span className="font-medium" style={{ color: '#b45309' }}>{daysToEarliestVacate}d</span>
                </div>
              )}
              <div className="flex justify-between pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Bedsitters</span>
                <span>{allUnits.filter((u) => u.unit_type === 'bedsitter').length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>1 Bedroom</span>
                <span>{allUnits.filter((u) => u.unit_type === '1br').length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>2 Bedrooms</span>
                <span>{allUnits.filter((u) => u.unit_type === '2br').length}</span>
              </div>
            </div>
          </div>

          {/* Edit building */}
          <BuildingEditForm building={building} />
        </div>
      </div>
    </div>
  );
}
