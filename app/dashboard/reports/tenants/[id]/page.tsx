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

  const [{ data: tenant }, { data: payments }, { data: notices }] = await Promise.all([
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
                    <th>Total</th>
                    <th>Method</th>
                    <th>Ref / Code</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{formatMonth(p.payment_month)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.rent_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.water_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.garbage_paid)}</td>
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

        {/* Summary */}
        <div
          className="grid grid-cols-3 gap-4 p-4 rounded-xl"
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
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Months Outstanding</div>
          </div>
        </div>

        {/* Outstanding months */}
        {outstandingMonths.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm" style={{ color: '#b91c1c' }}>
              Outstanding Months ({outstandingMonths.length})
            </h3>
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
