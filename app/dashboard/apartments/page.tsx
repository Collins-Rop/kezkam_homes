import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Building2, Users, DoorOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ApartmentsPage() {
  const supabase = createClient();

  const { data: apartments, error } = await supabase
    .from('apartments')
    .select(`
      *,
      tenants(id, full_name, is_active)
    `)
    .order('name');

  if (error) {
    return <p className="text-red-400">Error loading apartments: {error.message}</p>;
  }

  const totalBill = (a: { rent_amount: number; water_bill: number; garbage_bill: number }) =>
    a.rent_amount + a.water_bill + a.garbage_bill;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Apartments</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {apartments?.length ?? 0} units managed
          </p>
        </div>
        <Link href="/dashboard/apartments/new" className="btn-primary">
          <Plus size={16} /> Add Apartment
        </Link>
      </div>

      {apartments && apartments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apartments.map((apt) => {
            const activeTenants = (apt.tenants as { id: string; full_name: string; is_active: boolean }[])?.filter(
              (t) => t.is_active
            ) ?? [];

            return (
              <Link key={apt.id} href={`/dashboard/apartments/${apt.id}`} className="card-hover block">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: apt.is_occupied ? 'rgba(212,133,26,0.15)' : 'var(--color-surface-2)' }}
                  >
                    <Building2
                      size={20}
                      style={{ color: apt.is_occupied ? 'var(--color-brand)' : 'var(--color-text-subtle)' }}
                    />
                  </div>
                  <span className={apt.is_occupied ? 'badge-green' : 'badge-gray'}>
                    {apt.is_occupied ? 'Occupied' : 'Vacant'}
                  </span>
                </div>

                <h3
                  className="font-semibold text-lg mb-0.5"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {apt.name}
                </h3>
                {apt.floor && (
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Floor {apt.floor}
                  </p>
                )}

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>Rent</span>
                    <span className="font-medium">{formatCurrency(apt.rent_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>Water</span>
                    <span>{formatCurrency(apt.water_bill)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>Garbage</span>
                    <span>{formatCurrency(apt.garbage_bill)}</span>
                  </div>
                  <div
                    className="flex justify-between text-sm font-semibold pt-2"
                    style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-brand-light)' }}
                  >
                    <span>Total / month</span>
                    <span>{formatCurrency(totalBill(apt))}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {activeTenants.length > 0 ? (
                    <>
                      <Users size={13} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {activeTenants.map((t) => t.full_name).join(', ')}
                      </span>
                    </>
                  ) : (
                    <>
                      <DoorOpen size={13} style={{ color: 'var(--color-text-subtle)' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        No active tenants
                      </span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={40} style={{ color: 'var(--color-text-subtle)' }} className="mb-3" />
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
            No apartments yet
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-text-subtle)' }}>
            Add your first apartment to get started.
          </p>
          <Link href="/dashboard/apartments/new" className="btn-primary">
            <Plus size={16} /> Add Apartment
          </Link>
        </div>
      )}
    </div>
  );
}
