import { createClient } from '@/lib/supabase/server';
import { formatDate, formatMonth, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Phone, Mail, CreditCard, MessageSquare } from 'lucide-react';
import TenantMoveOutButton from '@/components/tenants/TenantMoveOutButton';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: tenant }, { data: payments }, { data: smsLogs }] = await Promise.all([
    supabase
      .from('tenants')
      .select('*, apartments(*)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', params.id)
      .order('payment_month', { ascending: false }),
    supabase
      .from('sms_logs')
      .select('*')
      .eq('tenant_id', params.id)
      .order('sent_at', { ascending: false })
      .limit(10),
  ]);

  if (!tenant) notFound();

  const apt = tenant.apartments as Record<string, unknown> | null;
  const totalPaid = payments?.reduce((s, p) => s + (p.total_paid ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/tenants" className="btn-secondary !px-2 !py-2 mt-1">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{tenant.full_name}</h1>
            <span className={tenant.is_active ? 'badge-green' : 'badge-gray'}>
              {tenant.is_active ? 'Active' : 'Moved Out'}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {apt ? (
              <Link href={`/dashboard/apartments/${tenant.apartment_id}`} style={{ color: 'var(--color-brand-light)' }}>
                {String(apt.name)}
              </Link>
            ) : 'No apartment assigned'}
            {' · '}Since {formatDate(tenant.move_in_date)}
          </p>
        </div>
        {tenant.is_active && (
          <TenantMoveOutButton tenantId={tenant.id} tenantName={tenant.full_name} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* Payment history */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Payment History
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Total: <span style={{ color: 'var(--color-brand-light)' }}>{formatCurrency(totalPaid)}</span>
                </span>
              </div>
            </div>
            {payments && payments.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Rent</th>
                    <th>Water</th>
                    <th>Garbage</th>
                    <th>Method</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{formatMonth(p.payment_month)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.rent_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.water_paid)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(p.garbage_paid)}</td>
                      <td>
                        <span className="badge-gray text-xs">{p.payment_method}</span>
                      </td>
                      <td className="text-right font-semibold" style={{ color: 'var(--color-brand-light)' }}>
                        {formatCurrency(p.total_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <CreditCard size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No payments recorded yet.</p>
              </div>
            )}
          </div>

          {/* SMS logs */}
          <div className="card">
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              SMS History
            </h2>
            {smsLogs && smsLogs.length > 0 ? (
              <div className="space-y-3">
                {smsLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={log.status === 'sent' ? 'badge-green' : 'badge-red'}>
                        {log.status}
                      </span>
                      <span className="badge-gray">{log.message_type}</span>
                      <span className="text-xs ml-auto" style={{ color: 'var(--color-text-subtle)' }}>
                        {new Date(log.sent_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs whitespace-pre-line" style={{ color: 'var(--color-text-muted)' }}>
                      {log.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No SMS sent yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="card h-fit space-y-4">
          <h2 className="font-semibold pb-3" style={{ fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--color-border)' }}>
            Contact Info
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone size={14} style={{ color: 'var(--color-brand)' }} />
              <span className="text-sm">{tenant.phone_number}</span>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} style={{ color: 'var(--color-brand)' }} />
                <span className="text-sm">{tenant.email}</span>
              </div>
            )}
            {tenant.national_id && (
              <div className="text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>National ID: </span>
                {tenant.national_id}
              </div>
            )}
            {tenant.move_out_date && (
              <div className="text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>Moved out: </span>
                {formatDate(tenant.move_out_date)}
              </div>
            )}
          </div>

          {tenant.notes && (
            <>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <p className="label">Notes</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tenant.notes}</p>
              </div>
            </>
          )}

          {apt && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <p className="label">Monthly Bill</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Rent</span>
                  <span>{formatCurrency(Number(apt.rent_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Water</span>
                  <span>{formatCurrency(Number(apt.water_bill))}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Garbage</span>
                  <span>{formatCurrency(Number(apt.garbage_bill))}</span>
                </div>
                <div
                  className="flex justify-between font-semibold pt-1"
                  style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-brand-light)' }}
                >
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      Number(apt.rent_amount) + Number(apt.water_bill) + Number(apt.garbage_bill)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
