import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatMonth, currentMonthISO } from '@/lib/utils';
import { Building2, Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import BuildingSelector from '@/components/dashboard/BuildingSelector';

export const dynamic = 'force-dynamic';

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { building?: string };
}) {
  const supabase = createClient();
  const thisMonth = currentMonthISO();
  const selectedBuildingId = searchParams.building ?? 'all';

  // Fetch buildings for the selector
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name')
    .order('name');

  // Apartments — optionally filtered by building
  let aptsQuery = supabase
    .from('apartments')
    .select('id, name, rent_amount, water_bill, garbage_bill, security_bill, is_occupied');

  if (selectedBuildingId !== 'all') {
    aptsQuery = aptsQuery.eq('building_id', selectedBuildingId);
  }

  const { data: allApartments } = await aptsQuery;

  const apartmentIds = (allApartments ?? []).map((a) => a.id);
  const totalApartments = allApartments?.length ?? 0;
  const occupiedApartments = allApartments?.filter((a) => a.is_occupied).length ?? 0;

  // Tenants and payments filtered by apartment IDs
  const [
    { count: totalTenants },
    { data: thisMonthPayments },
    { data: recentPayments },
  ] = await Promise.all([
    apartmentIds.length > 0
      ? supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .in('apartment_id', apartmentIds)
      : supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .in('apartment_id', ['00000000-0000-0000-0000-000000000000']), // empty result when no apartments

    apartmentIds.length > 0
      ? supabase
          .from('payments')
          .select('total_paid')
          .eq('payment_month', thisMonth)
          .in('apartment_id', apartmentIds)
      : Promise.resolve({ data: [] }),

    apartmentIds.length > 0
      ? supabase
          .from('payments')
          .select('id, total_paid, payment_date, payment_month, tenants(full_name), apartments(name)')
          .eq('payment_month', thisMonth)
          .in('apartment_id', apartmentIds)
          .order('payment_date', { ascending: false })
          .limit(5)
      : supabase
          .from('payments')
          .select('id, total_paid, payment_date, payment_month, tenants(full_name), apartments(name)')
          .eq('payment_month', thisMonth)
          .order('payment_date', { ascending: false })
          .limit(5),
  ]);

  const monthlyRevenue = (thisMonthPayments ?? []).reduce((sum, p) => sum + (p.total_paid ?? 0), 0);
  const paidCount = thisMonthPayments?.length ?? 0;
  const activeTenants = totalTenants ?? 0;
  const unpaidCount = activeTenants - paidCount;

  const expectedRevenue = (allApartments ?? []).reduce(
    (sum, a) => sum + a.rent_amount + a.water_bill + a.garbage_bill + (a.security_bill ?? 0),
    0
  );

  const collectionRate = expectedRevenue > 0 ? Math.round((monthlyRevenue / expectedRevenue) * 100) : 0;

  const selectedBuilding = buildings?.find((b) => b.id === selectedBuildingId);

  const stats = [
    {
      label: 'Total Units',
      value: totalApartments,
      sub: `${occupiedApartments} occupied · ${totalApartments - occupiedApartments} vacant`,
      icon: Building2,
      color: 'var(--color-brand)',
    },
    {
      label: 'Active Tenants',
      value: activeTenants,
      sub: `${totalApartments - occupiedApartments} vacant unit${totalApartments - occupiedApartments !== 1 ? 's' : ''}`,
      icon: Users,
      color: '#4ade80',
    },
    {
      label: `Collected — ${formatMonth(thisMonth)}`,
      value: formatCurrency(monthlyRevenue),
      sub: `${paidCount} of ${activeTenants} paid`,
      icon: CreditCard,
      color: '#60a5fa',
    },
    {
      label: 'Collection Rate',
      value: `${collectionRate}%`,
      sub: `Target: ${formatCurrency(expectedRevenue)}`,
      icon: TrendingUp,
      color: '#a78bfa',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {selectedBuilding ? selectedBuilding.name : 'All Buildings'} · {formatMonth(thisMonth)}
          </p>
        </div>
        <BuildingSelector
          buildings={buildings ?? []}
          selectedId={selectedBuildingId}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <div className="mt-3">
              <div className="stat-value text-2xl">{value}</div>
              <div className="stat-label mt-1">{label}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Unpaid alert */}
      {unpaidCount > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)',
          }}
        >
          <AlertCircle size={18} style={{ color: 'var(--color-brand)' }} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-brand-light)' }}>
              {unpaidCount} tenant{unpaidCount !== 1 ? 's have' : ' has'} not paid for {formatMonth(thisMonth)}
              {selectedBuilding ? ` in ${selectedBuilding.name}` : ''}
            </p>
            <Link href="/dashboard/payments" className="text-xs hover:underline" style={{ color: 'var(--color-brand)', opacity: 0.7 }}>
              View payment tracker →
            </Link>
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Recent Payments — {formatMonth(thisMonth)}
          </h2>
          <Link href="/dashboard/payments" className="text-xs" style={{ color: 'var(--color-brand)' }}>
            View all →
          </Link>
        </div>
        {recentPayments && recentPayments.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">
                    {firstRelation(p.tenants as { full_name: string } | { full_name: string }[] | null)?.full_name ?? '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {firstRelation(p.apartments as { name: string } | { name: string }[] | null)?.name ?? '—'}
                  </td>
                  <td className="text-right font-medium" style={{ color: 'var(--color-brand-light)' }}>
                    {formatCurrency(p.total_paid ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            No payments recorded yet for {formatMonth(thisMonth)}.
          </p>
        )}
      </div>
    </div>
  );
}
