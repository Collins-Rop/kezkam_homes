import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { UNIT_TYPE_LABELS } from '@/lib/supabase/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PrintButton from '@/components/PrintButton';
import {
  format,
  parseISO,
  startOfMonth,
  subMonths,
  differenceInDays,
  eachMonthOfInterval,
} from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function BuildingReportPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const now = new Date();
  const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd');
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');

  const [
    { data: building },
    { data: units },
    { data: activeNotices },
  ] = await Promise.all([
    supabase.from('buildings').select('*').eq('id', params.id).single(),
    supabase
      .from('apartments')
      .select('*, tenants(id, full_name, is_active, move_in_date)')
      .eq('building_id', params.id)
      .order('name'),
    supabase
      .from('notices')
      .select('*, tenants(full_name), apartments(name)')
      .eq('status', 'active'),
  ]);

  if (!building) notFound();

  const allUnits = units ?? [];
  const unitIds = new Set(allUnits.map((u) => u.id));

  // Fetch all payments for this building (no date limit — needed for arrears calculation)
  const { data: allBuildingPayments } = unitIds.size > 0
    ? await supabase
        .from('payments')
        .select('*, tenants(full_name)')
        .in('apartment_id', Array.from(unitIds))
        .order('payment_month', { ascending: false })
    : { data: [] };

  const allPaymentsData = allBuildingPayments ?? [];
  // Last 6 months slice for the monthly collection table
  const paymentsData = allPaymentsData.filter(
    (p) => p.payment_month >= sixMonthsAgo
  );

  // Building notices scoped to this building's units
  const buildingActiveNotices = (activeNotices ?? []).filter((n) =>
    unitIds.has(n.apartment_id)
  );
  const noticeUnitIds = new Set(buildingActiveNotices.map((n) => n.apartment_id));

  // Stats
  const totalUnits = allUnits.length;
  const occupied = allUnits.filter((u) => u.is_occupied).length;
  const vacant = totalUnits - occupied;

  // Current month payments
  const currentMonthPayments = paymentsData.filter(
    (p) => p.payment_month.slice(0, 7) === currentMonth.slice(0, 7)
  );
  const currentMonthPaid = currentMonthPayments.reduce((s, p) => s + (p.total_paid ?? 0), 0);

  // Expected this month = sum of rent+water+garbage+security for all occupied units
  const expectedThisMonth = allUnits
    .filter((u) => u.is_occupied)
    .reduce((s, u) => s + u.rent_amount + u.water_bill + u.garbage_bill + (u.security_bill ?? 0), 0);

  const collectionRate =
    expectedThisMonth > 0
      ? Math.round((currentMonthPaid / expectedThisMonth) * 100)
      : 0;

  // Monthly collection table — last 6 months
  const months: { label: string; value: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i));
    months.push({ label: format(d, 'MMM yyyy'), value: format(d, 'yyyy-MM') });
  }

  const monthlyStats = months.map(({ label, value }) => {
    const monthPayments = paymentsData.filter((p) => p.payment_month.slice(0, 7) === value);
    const collected = monthPayments.reduce((s, p) => s + (p.total_paid ?? 0), 0);
    const paidUnitIds = new Set(monthPayments.map((p) => p.apartment_id));
    const expectedUnits = allUnits.filter((u) => {
      // Unit that had an active tenant during that month (approximation: is_occupied)
      return u.is_occupied || paidUnitIds.has(u.id);
    });
    const expected = expectedUnits.reduce(
      (s, u) => s + u.rent_amount + u.water_bill + u.garbage_bill + (u.security_bill ?? 0),
      0
    );
    const outstanding = Math.max(0, expected - collected);
    const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    return { label, value, collected, expected, outstanding, pct };
  });

  // Floor breakdown
  const floors = Array.from(new Set(allUnits.map((u) => u.floor ?? 'Unknown'))).sort();
  const floorStats = floors.map((floor) => {
    const floorUnits = allUnits.filter((u) => (u.floor ?? 'Unknown') === floor);
    const occ = floorUnits.filter((u) => u.is_occupied).length;
    const vac = floorUnits.length - occ;
    const notice = floorUnits.filter((u) => noticeUnitIds.has(u.id)).length;
    return { floor, total: floorUnits.length, occupied: occ, vacant: vac, notice };
  });

  // Unit type breakdown
  const typeStats = (Object.keys(UNIT_TYPE_LABELS) as (keyof typeof UNIT_TYPE_LABELS)[]).map((t) => {
    const typeUnits = allUnits.filter((u) => u.unit_type === t);
    const occ = typeUnits.filter((u) => u.is_occupied).length;
    const notice = typeUnits.filter((u) => noticeUnitIds.has(u.id)).length;
    return { type: t, label: UNIT_TYPE_LABELS[t], total: typeUnits.length, occupied: occ, vacant: typeUnits.length - occ, notice };
  }).filter((t) => t.total > 0);

  // Paid tenant IDs grouped by tenant for arrears calculation
  const paidMonthsByTenant = new Map<string, Set<string>>();
  for (const p of allPaymentsData) {
    if (!paidMonthsByTenant.has(p.tenant_id)) paidMonthsByTenant.set(p.tenant_id, new Set());
    paidMonthsByTenant.get(p.tenant_id)!.add(p.payment_month.slice(0, 7));
  }

  // Unpaid tenants this month + cumulative arrears
  const paidThisMonthTenantIds = new Set(currentMonthPayments.map((p) => p.tenant_id));
  const currentMonthStr = format(startOfMonth(now), 'yyyy-MM');

  const unpaidTenants = allUnits
    .flatMap((u) => {
      const monthlyBill = u.rent_amount + u.water_bill + u.garbage_bill + (u.security_bill ?? 0);
      const activeTenants = (u.tenants as { id: string; full_name: string; is_active: boolean; move_in_date: string }[] ?? []).filter(
        (t) => t.is_active && !paidThisMonthTenantIds.has(t.id)
      );
      return activeTenants.map((t) => {
        const moveIn = parseISO(t.move_in_date);
        const months = eachMonthOfInterval({ start: startOfMonth(moveIn), end: startOfMonth(now) });
        const tenantPaid = paidMonthsByTenant.get(t.id) ?? new Set<string>();
        const arrearsMonths = months.filter((m) => !tenantPaid.has(format(m, 'yyyy-MM')));
        const arrearsAmount = arrearsMonths.length * monthlyBill;
        return {
          ...t,
          unit: u.name,
          monthlyBill,
          arrearsMonths: arrearsMonths.length,
          arrearsAmount,
        };
      });
    })
    .sort((a, b) => b.arrearsAmount - a.arrearsAmount);

  // Total cumulative arrears across all active tenants in this building
  const totalArrears = allUnits.flatMap((u) => {
    const monthlyBill = u.rent_amount + u.water_bill + u.garbage_bill + (u.security_bill ?? 0);
    return (u.tenants as { id: string; is_active: boolean; move_in_date: string }[] ?? [])
      .filter((t) => t.is_active)
      .map((t) => {
        const moveIn = parseISO(t.move_in_date);
        const months = eachMonthOfInterval({ start: startOfMonth(moveIn), end: startOfMonth(now) });
        const tenantPaid = paidMonthsByTenant.get(t.id) ?? new Set<string>();
        return months.filter((m) => !tenantPaid.has(format(m, 'yyyy-MM'))).length * monthlyBill;
      });
  }).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/dashboard/apartments/${params.id}`} className="btn-secondary !px-2 !py-2 mt-1">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{building.name} — Report</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Generated {format(now, 'dd MMM yyyy HH:mm')}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Total Units', value: String(totalUnits), color: 'var(--color-brand-light)' },
          { label: 'Occupied', value: String(occupied), color: '#15803d' },
          { label: 'Vacant', value: String(vacant), color: 'var(--color-text-muted)' },
          { label: 'Collection This Month', value: `${collectionRate}%`, color: collectionRate >= 80 ? '#15803d' : '#b91c1c' },
          { label: 'Total Arrears', value: formatCurrency(totalArrears), color: totalArrears > 0 ? '#b91c1c' : '#15803d' },
        ].map((s) => (
          <div key={s.label} className="card text-center space-y-1">
            <div
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly collection table */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Monthly Collection (Last 6 Months)
          </h2>
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Month</th>
                <th>Expected</th>
                <th>Collected</th>
                <th>Outstanding</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((m) => (
                <tr key={m.value}>
                  <td className="font-medium">{m.label}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(m.expected)}</td>
                  <td style={{ color: '#15803d' }}>{formatCurrency(m.collected)}</td>
                  <td style={{ color: m.outstanding > 0 ? '#b91c1c' : 'var(--color-text-muted)' }}>
                    {formatCurrency(m.outstanding)}
                  </td>
                  <td>
                    <span className={m.pct >= 80 ? 'badge-green' : m.pct >= 50 ? 'badge-amber' : 'badge-red'}>
                      {m.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Occupancy by floor */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Occupancy by Floor
          </h2>
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Floor</th>
                <th>Total</th>
                <th>Occupied</th>
                <th>Vacant</th>
                <th>On Notice</th>
              </tr>
            </thead>
            <tbody>
              {floorStats.map((f) => (
                <tr key={f.floor}>
                  <td className="font-medium">{f.floor}</td>
                  <td>{f.total}</td>
                  <td style={{ color: '#15803d' }}>{f.occupied}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{f.vacant}</td>
                  <td style={{ color: f.notice > 0 ? '#b45309' : 'var(--color-text-muted)' }}>{f.notice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Occupancy by unit type */}
        {typeStats.length > 0 && (
          <div className="card">
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Occupancy by Unit Type
            </h2>
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Occupied</th>
                  <th>Vacant</th>
                  <th>On Notice</th>
                </tr>
              </thead>
              <tbody>
                {typeStats.map((t) => (
                  <tr key={t.type}>
                    <td className="font-medium">{t.label}</td>
                    <td>{t.total}</td>
                    <td style={{ color: '#15803d' }}>{t.occupied}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{t.vacant}</td>
                    <td style={{ color: t.notice > 0 ? '#b45309' : 'var(--color-text-muted)' }}>{t.notice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Unpaid tenants this month */}
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Unpaid Tenants — {format(now, 'MMMM yyyy')}
          </h2>
          {unpaidTenants.length === 0 ? (
            <div
              className="text-center py-8 rounded-xl"
              style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}
            >
              <p className="font-medium" style={{ color: '#15803d' }}>All tenants paid this month!</p>
            </div>
          ) : (
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th>This Month</th>
                  <th>Arrears Months</th>
                  <th>Total Owed</th>
                </tr>
              </thead>
              <tbody>
                {unpaidTenants.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.full_name}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{t.unit}</td>
                    <td style={{ color: '#b91c1c' }}>{formatCurrency(t.monthlyBill)}</td>
                    <td>
                      {t.arrearsMonths > 1 ? (
                        <span className="badge-red">{t.arrearsMonths} months</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>1 month</span>
                      )}
                    </td>
                    <td className="font-semibold" style={{ color: '#b91c1c' }}>
                      {formatCurrency(t.arrearsAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td colSpan={4} className="font-semibold text-right pr-4">Total Arrears:</td>
                  <td className="font-bold" style={{ color: '#b91c1c' }}>
                    {formatCurrency(unpaidTenants.reduce((s, t) => s + t.arrearsAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Units on notice */}
      {buildingActiveNotices.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Units on Notice
          </h2>
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Vacate Date</th>
                <th>Days Left</th>
                <th>Refund Due</th>
              </tr>
            </thead>
            <tbody>
              {buildingActiveNotices.map((n) => {
                const daysLeft = differenceInDays(parseISO(n.vacate_date), now);
                const t = n.tenants as { full_name: string } | null;
                const a = n.apartments as { name: string } | null;
                return (
                  <tr key={n.id}>
                    <td className="font-medium">{t?.full_name ?? '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{a?.name ?? '—'}</td>
                    <td>{format(parseISO(n.vacate_date), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={daysLeft <= 7 ? 'badge-red' : daysLeft <= 30 ? 'badge-amber' : 'badge-gray'}>
                        {daysLeft}d
                      </span>
                    </td>
                    <td style={{ color: '#15803d' }}>{formatCurrency(Number(n.refund_amount))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
