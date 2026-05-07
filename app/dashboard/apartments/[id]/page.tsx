import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, formatMonth, currentMonthISO } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus, UserCheck, UserX } from 'lucide-react';
import ApartmentEditForm from '@/components/apartments/ApartmentEditForm';
import TenantMoveOutButton from '@/components/tenants/TenantMoveOutButton';
import AddTenantModal from '@/components/tenants/AddTenantModal';

export const dynamic = 'force-dynamic';

export default async function ApartmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: apt }, { data: tenants }, { data: payments }] = await Promise.all([
    supabase.from('apartments').select('*').eq('id', params.id).single(),
    supabase
      .from('tenants')
      .select('*')
      .eq('apartment_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('apartment_id', params.id)
      .order('payment_month', { ascending: false })
      .limit(12),
  ]);

  if (!apt) notFound();

  const activeTenants = tenants?.filter((t) => t.is_active) ?? [];
  const pastTenants = tenants?.filter((t) => !t.is_active) ?? [];
  const thisMonth = currentMonthISO();
  const paidThisMonth = payments?.some((p) => p.payment_month === thisMonth);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/apartments" className="btn-secondary !px-2 !py-2 mt-1">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{apt.name}</h1>
            <span className={apt.is_occupied ? 'badge-green' : 'badge-gray'}>
              {apt.is_occupied ? 'Occupied' : 'Vacant'}
            </span>
            {apt.is_occupied && (
              <span className={paidThisMonth ? 'badge-green' : 'badge-red'}>
                {paidThisMonth ? 'Paid this month' : 'Unpaid this month'}
              </span>
            )}
          </div>
          {apt.floor && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Floor {apt.floor}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Tenants */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Active Tenants
              </h2>
              <AddTenantModal apartmentId={apt.id} />
            </div>

            {activeTenants.length > 0 ? (
              <div className="space-y-3">
                {activeTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                        style={{ background: 'rgba(212,133,26,0.15)', color: 'var(--color-brand)' }}
                      >
                        {tenant.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/tenants/${tenant.id}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {tenant.full_name}
                        </Link>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {tenant.phone_number} · Since {formatDate(tenant.move_in_date)}
                        </p>
                      </div>
                    </div>
                    <TenantMoveOutButton tenantId={tenant.id} tenantName={tenant.full_name} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No active tenants. Add one to get started.
                </p>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Payment History
              </h2>
              <Link href={`/dashboard/payments?apartment=${apt.id}`} className="text-xs" style={{ color: 'var(--color-brand)' }}>
                Record payment →
              </Link>
            </div>
            {payments && payments.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Rent</th>
                    <th>Water</th>
                    <th>Garbage</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatMonth(p.payment_month)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.rent_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.water_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.garbage_paid)}</td>
                      <td className="text-right font-medium" style={{ color: 'var(--color-brand-light)' }}>
                        {formatCurrency(p.total_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                No payments recorded yet.
              </p>
            )}
          </div>

          {/* Past tenants */}
          {pastTenants.length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Past Tenants
              </h2>
              <div className="space-y-2">
                {pastTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <div className="flex items-center gap-2">
                      <UserX size={14} style={{ color: 'var(--color-text-subtle)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {tenant.full_name}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      Moved out {tenant.move_out_date ? formatDate(tenant.move_out_date) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — edit form */}
        <div>
          <ApartmentEditForm apartment={apt} />
        </div>
      </div>
    </div>
  );
}
