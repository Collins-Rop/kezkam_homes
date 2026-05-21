import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMonth, formatCurrency } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO, eachMonthOfInterval, startOfMonth } from 'date-fns';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function TenantStatementPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [
    { data: tenant },
    { data: payments },
    { data: paymentTransactions },
    { data: balanceAdjustments },
    { data: notices },
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('*, apartments(*, buildings(*))')
      .eq('id', params.id)
      .single(),
    supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', params.id)
      .order('payment_month', { ascending: true }),
    supabase
      .from('payment_transactions')
      .select('*')
      .eq('tenant_id', params.id)
      .order('transaction_date', { ascending: true }),
    supabase
      .from('tenant_balance_adjustments')
      .select('*')
      .eq('tenant_id', params.id)
      .order('adjustment_month', { ascending: true }),
    supabase
      .from('notices')
      .select('*')
      .eq('tenant_id', params.id)
      .eq('status', 'active')
      .limit(1),
  ]);

  if (!tenant) notFound();

  const apt = tenant.apartments as (Record<string, unknown> & { buildings?: Record<string, unknown> | null }) | null;
  const building = apt?.buildings as Record<string, unknown> | null;

  const totalPaid = payments?.reduce((s, p) => s + (p.total_paid ?? 0), 0) ?? 0;

  // Compute outstanding months from move_in to today
  const moveInDate = parseISO(tenant.move_in_date);
  const now = new Date();
  const allMonths = eachMonthOfInterval({
    start: startOfMonth(moveInDate),
    end: startOfMonth(now),
  });

  const paidMonths = new Set((payments ?? []).map((p) => p.payment_month.slice(0, 7)));
  const outstandingMonths = allMonths.filter(
    (m) => !paidMonths.has(format(m, 'yyyy-MM'))
  );

  // Advance payments: months beyond current
  const currentMonthStr = format(startOfMonth(now), 'yyyy-MM');
  const advancePayments = (payments ?? []).filter(
    (p) => p.payment_month.slice(0, 7) > currentMonthStr
  );

  // Balance calculations
  const monthlyBill = apt
    ? Number(apt.rent_amount) + Number(apt.water_bill) + Number(apt.garbage_bill) + Number(apt.security_bill ?? 0)
    : 0;
  const arrearsAmount = outstandingMonths.length * monthlyBill;
  const manualAdjustmentsTotal = (balanceAdjustments ?? []).reduce(
    (s, adjustment) => s + Number(adjustment.amount ?? 0),
    0,
  );
  // Total paid excluding deposit (deposit is a one-time item, not monthly)
  const totalPaidMonthly = (payments ?? []).reduce(
    (s, p) =>
      s +
      p.rent_paid +
      p.water_paid +
      p.garbage_paid +
      p.security_paid +
      (p.arrears_paid ?? 0),
    0,
  );
  const totalExpectedToDate = allMonths.length * monthlyBill;
  // Net: positive = credit/advance, negative = arrears
  const netBalance = totalPaidMonthly - totalExpectedToDate - manualAdjustmentsTotal;

  const activeNotice = notices?.[0] ?? null;
  const generatedDate = format(now, 'dd MMM yyyy HH:mm');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Nav - not printed */}
      <div className="flex items-center gap-4 print:hidden">
        <Link href={`/dashboard/tenants/${params.id}`} className="btn-secondary !px-2 !py-2">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="page-title">Tenant Statement</h1>
        <div className="ml-auto">
          <PrintButton label="Print Statement" />
        </div>
      </div>

      {/* Statement content */}
      <div
        className="card space-y-6"
        style={{ maxWidth: '800px' }}
        id="statement-print"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-5" style={{ borderBottom: '2px solid var(--color-brand)' }}>
          <div>
            <div
              className="text-2xl font-bold tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)' }}
            >
              KEZKAM HOMES
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Property Management
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Tenant Statement
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Generated: {generatedDate}
            </div>
          </div>
        </div>

        {/* Tenant info */}
        <div
          className="grid grid-cols-2 gap-4 p-4 rounded-xl"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div className="space-y-1.5 text-sm">
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Tenant: </span>
              <span className="font-semibold">{tenant.full_name}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Phone: </span>
              <span>{tenant.phone_number}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Move-in: </span>
              <span>{formatDate(tenant.move_in_date)}</span>
            </div>
            {tenant.move_out_date && (
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Moved out: </span>
                <span>{formatDate(tenant.move_out_date)}</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-sm">
            {apt && (
              <>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Unit: </span>
                  <span className="font-semibold">{String(apt.name)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Building: </span>
                  <span>{building ? String(building.name) : '—'}</span>
                </div>
                {apt.floor && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Floor: </span>
                    <span>{String(apt.floor)}</span>
                  </div>
                )}
                {apt.unit_type && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Unit Type: </span>
                    <span className="capitalize">{String(apt.unit_type)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active notice */}
        {activeNotice && (
          <div
            className="p-3 rounded-xl text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <span className="font-medium" style={{ color: '#b45309' }}>Notice to Vacate: </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Vacate by {formatDate(activeNotice.vacate_date)} · Refund due: {formatCurrency(Number(activeNotice.refund_amount))}
            </span>
          </div>
        )}

        {/* Payment table */}
        <div>
          <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Payment History
          </h3>
          {payments && payments.length > 0 ? (
            <div className="overflow-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Rent</th>
                    <th>Water</th>
                    <th>Garbage</th>
                    <th>Security</th>
                    <th>Arrears</th>
                    <th>Deposit</th>
                    <th>Total</th>
                    <th>Method</th>
                    <th>Ref / Code</th>
                    <th>Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{formatMonth(p.payment_month)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.rent_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.water_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.garbage_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.security_paid)}</td>
                      <td style={{ color: (p.arrears_paid ?? 0) ? 'var(--color-brand-light)' : 'var(--color-text-subtle)' }}>
                        {(p.arrears_paid ?? 0) ? formatCurrency(p.arrears_paid ?? 0) : '—'}
                      </td>
                      <td style={{ color: (p as { deposit_paid?: number }).deposit_paid ? 'var(--color-brand-light)' : 'var(--color-text-subtle)' }}>
                        {(p as { deposit_paid?: number }).deposit_paid
                          ? formatCurrency((p as { deposit_paid?: number }).deposit_paid!)
                          : '—'}
                      </td>
                      <td className="font-semibold" style={{ color: 'var(--color-brand-light)' }}>
                        {formatCurrency(p.total_paid)}
                      </td>
                      <td>
                        <span className="badge-gray text-xs">{p.payment_method}</span>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.reference_number ?? '—'}
                      </td>
                      <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.payment_date ? format(parseISO(p.payment_date.slice(0, 10)), 'dd MMM yyyy') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No payments recorded.</p>
          )}
        </div>

        {paymentTransactions && paymentTransactions.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Transaction History
            </h3>
            <div className="overflow-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Date Captured</th>
                    <th>Month</th>
                    <th>Ref / Code</th>
                    <th>Method</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.transaction_date ? format(parseISO(tx.transaction_date.slice(0, 10)), 'dd MMM yyyy') : '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{format(parseISO(tx.payment_month), 'MMM yyyy')}</td>
                      <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tx.reference_number ?? '—'}</td>
                      <td><span className="badge-gray text-xs">{tx.payment_method}</span></td>
                      <td className="font-semibold" style={{ color: 'var(--color-brand-light)' }}>
                        {formatCurrency(tx.total_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {manualAdjustmentsTotal !== 0 && (
          <div
            className="p-4 rounded-xl text-sm"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.22)' }}
          >
            <span className="font-medium" style={{ color: '#b45309' }}>Manual balance adjustments: </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {manualAdjustmentsTotal > 0 ? 'Added arrears' : 'Added credit'} of {formatCurrency(Math.abs(manualAdjustmentsTotal))}
            </span>
          </div>
        )}

        {/* Summary */}
        <div
          className="grid grid-cols-2 gap-4 p-4 rounded-xl sm:grid-cols-4"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-brand-light)', fontFamily: 'var(--font-display)' }}>
              {formatCurrency(totalPaid)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Total Paid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#15803d', fontFamily: 'var(--font-display)' }}>
              {payments?.length ?? 0}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Months Paid</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: outstandingMonths.length > 0 ? '#b91c1c' : '#15803d', fontFamily: 'var(--font-display)' }}
            >
              {outstandingMonths.length}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Months Arrears</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{
                color: netBalance > 0 ? '#15803d' : netBalance < 0 ? '#b91c1c' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {netBalance > 0 ? '+' : ''}{formatCurrency(Math.abs(netBalance))}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {netBalance > 0 ? 'Credit / Advance' : netBalance < 0 ? 'Balance Owed' : 'Settled'}
            </div>
          </div>
        </div>

        {/* Arrears breakdown */}
        {outstandingMonths.length > 0 && (
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: '#b91c1c' }}>
                Arrears — {outstandingMonths.length} unpaid month{outstandingMonths.length !== 1 ? 's' : ''}
              </h3>
              <span className="font-bold text-sm" style={{ color: '#b91c1c' }}>
                {formatCurrency(arrearsAmount)} owed
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {outstandingMonths.map((m) => (
                <span
                  key={format(m, 'yyyy-MM')}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(220,38,38,0.08)',
                    color: '#b91c1c',
                    border: '1px solid rgba(220,38,38,0.2)',
                  }}
                >
                  {format(m, 'MMM yyyy')}
                </span>
              ))}
            </div>
            {monthlyBill > 0 && (
              <p className="text-xs" style={{ color: '#b91c1c' }}>
                Monthly bill: {formatCurrency(monthlyBill)} × {outstandingMonths.length} months = {formatCurrency(arrearsAmount)}
              </p>
            )}
          </div>
        )}

        {/* Advance payments info */}
        {advancePayments.length > 0 && (
          <div
            className="p-4 rounded-xl space-y-2"
            style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: '#15803d' }}>
                Advance Payments — {advancePayments.length} future month{advancePayments.length !== 1 ? 's' : ''} covered
              </h3>
              <span className="font-bold text-sm" style={{ color: '#15803d' }}>
                {formatCurrency(advancePayments.reduce((s, p) => s + p.total_paid, 0))} ahead
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {advancePayments.map((p) => (
                <span
                  key={p.payment_month}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(22,163,74,0.1)',
                    color: '#15803d',
                    border: '1px solid rgba(22,163,74,0.2)',
                  }}
                >
                  {format(parseISO(p.payment_month), 'MMM yyyy')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="pt-4 text-xs text-center"
          style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}
        >
          Kezkam Homes Limited · This statement is auto-generated and serves as an official record.
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#__next) { display: none; }
          .print\\:hidden { display: none !important; }
          #statement-print { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
