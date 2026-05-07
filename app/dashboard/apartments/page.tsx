import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Building2, BedDouble, DoorOpen } from 'lucide-react';
import type { BuildingWithUnits } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function BuildingsPage() {
  const supabase = createClient();

  const { data: buildings, error } = await supabase
    .from('buildings')
    .select(`
      *,
      apartments(
        id, name, floor, unit_type, rent_amount, water_bill, garbage_bill, is_occupied,
        tenants(id, full_name, is_active)
      )
    `)
    .order('name');

  if (error) {
    return <p style={{ color: '#f87171' }}>Error loading buildings: {error.message}</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Buildings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {buildings?.length ?? 0} building{buildings?.length !== 1 ? 's' : ''} managed
          </p>
        </div>
        <Link href="/dashboard/apartments/new" className="btn-primary">
          <Plus size={16} /> Add Building
        </Link>
      </div>

      {buildings && buildings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(buildings as BuildingWithUnits[]).map((building) => {
            const units = building.apartments ?? [];
            const occupied = units.filter((u) => u.is_occupied).length;
            const vacant = units.length - occupied;

            // Group by unit type for summary
            const byType = {
              bedsitter: units.filter((u) => u.unit_type === 'bedsitter').length,
              '1br': units.filter((u) => u.unit_type === '1br').length,
              '2br': units.filter((u) => u.unit_type === '2br').length,
            };

            return (
              <Link
                key={building.id}
                href={`/dashboard/apartments/${building.id}`}
                className="card-hover block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(176,138,36,0.12)' }}
                  >
                    <Building2 size={22} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {occupied > 0 && (
                      <span className="badge-green">{occupied} occupied</span>
                    )}
                    {vacant > 0 && (
                      <span className="badge-gray">{vacant} vacant</span>
                    )}
                  </div>
                </div>

                <h3
                  className="font-semibold text-lg mb-0.5"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {building.name}
                </h3>
                {building.description && (
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    {building.description}
                  </p>
                )}

                {/* Unit type breakdown */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {byType.bedsitter > 0 && (
                    <span className="badge-gray text-xs">
                      <BedDouble size={11} /> {byType.bedsitter} bedsitter{byType.bedsitter !== 1 ? 's' : ''}
                    </span>
                  )}
                  {byType['1br'] > 0 && (
                    <span className="badge-gray text-xs">
                      {byType['1br']} 1-bed
                    </span>
                  )}
                  {byType['2br'] > 0 && (
                    <span className="badge-gray text-xs">
                      {byType['2br']} 2-bed
                    </span>
                  )}
                  {units.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      No units yet
                    </span>
                  )}
                </div>

                <div
                  className="mt-4 pt-3 flex items-center justify-between"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {units.length} unit{units.length !== 1 ? 's' : ''} total
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    View building →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={40} style={{ color: 'var(--color-text-subtle)' }} className="mb-3" />
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
            No buildings yet
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-text-subtle)' }}>
            Add your first building to get started.
          </p>
          <Link href="/dashboard/apartments/new" className="btn-primary">
            <Plus size={16} /> Add Building
          </Link>
        </div>
      )}
    </div>
  );
}
