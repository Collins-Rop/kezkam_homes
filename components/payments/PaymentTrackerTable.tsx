'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import RecordPaymentModal from './RecordPaymentModal';
import type { Tenant, Apartment, Payment } from '@/lib/supabase/types';

type TenantWithApt = Tenant & { apartments: Apartment | null };

interface Props {
  tenants: TenantWithApt[];
  payments: Payment[];
  selectedMonth: string;
  allTenants: (Tenant & { apartments: unknown })[];
  apartments: Pick<Apartment, 'id' | 'name'>[];
}

export default function PaymentTrackerTable({
  tenants,
  payments,
  selectedMonth,
  allTenants,
  apartments,
}: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [recordingFor, setRecordingFor] = useState<string | null>(null); // tenant id

  const paymentMap = useMemo(
    () => new Map(payments.map((p) => [p.tenant_id, p])),
    [payments],
  );

  // Group tenants by apartment
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { apt: Apartment; tenants: TenantWithApt[] }
    >();

    tenants.forEach((t) => {
      if (!t.apartment_id || !t.apartments) return;
      const key = t.apartment_id;
      if (!map.has(key)) {
        map.set(key, { apt: t.apartments, tenants: [] });
      }
      map.get(key)!.tenants.push(t);
    });

    // Sort: apartments with unpaid tenants first, then by name
    return Array.from(map.values()).sort((a, b) => {
      const aUnpaid = a.tenants.filter((t) => !paymentMap.has(t.id)).length;
      const bUnpaid = b.tenants.filter((t) => !paymentMap.has(t.id)).length;
      if (aUnpaid !== bUnpaid) return bUnpaid - aUnpaid; // unpaid first
      return a.apt.name.localeCompare(b.apt.name);
    });
  }, [tenants, paymentMap]);

  // Also handle tenants with no apartment
  const noAptTenants = useMemo(
    () => tenants.filter((t) => !t.apartment_id),
    [tenants],
  );

  const totalPaid = useMemo(
    () => tenants.filter((t) => paymentMap.has(t.id)).length,
    [tenants, paymentMap],
  );

  const totalRevenue = useMemo(
    () => payments.reduce((s, p) => s + (p.total_paid ?? 0), 0),
    [payments],
  );

  // Filter by search term
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        tenants: g.tenants.filter(
          (t) =>
            t.full_name.toLowerCase().includes(q) ||
            g.apt.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.tenants.length > 0);
  }, [groups, search]);

  function toggleApt(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(groups.map((g) => g.apt.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  const recordingTenant = recordingFor
    ? allTenants.find((t) => t.id === recordingFor) ?? null
    : null;

  return (
    <div className="space-y-4">
      {/* ── Summary bar ──────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {totalPaid} of {tenants.length} tenants paid
            </span>
            <span className="text-sm ml-3" style={{ color: 'var(--color-text-muted)' }}>
              · {formatCurrency(totalRevenue)} collected
            </span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-brand)' }}>
            {tenants.length > 0
              ? Math.round((totalPaid / tenants.length) * 100)
              : 0}
            % collected
          </span>
        </div>
        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '8px', background: 'var(--color-surface-2)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${tenants.length > 0 ? (totalPaid / tenants.length) * 100 : 0}%`,
              background:
                totalPaid === tenants.length
                  ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                  : 'linear-gradient(90deg,var(--color-brand-dark),var(--color-brand),var(--color-brand-light))',
            }}
          />
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-subtle)' }}
          />
          <input
            className="input !pl-9"
            placeholder="Search tenants or apartments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={expandAll}
          className="btn-secondary !py-2 !text-xs"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="btn-secondary !py-2 !text-xs"
        >
          Collapse all
        </button>
      </div>

      {/* ── Apartment groups ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredGroups.map(({ apt, tenants: aptTenants }) => {
          const paidCount = aptTenants.filter((t) => paymentMap.has(t.id)).length;
          const isFullyPaid = paidCount === aptTenants.length;
          const isPartiallyPaid = paidCount > 0 && !isFullyPaid;
          const isOpen = expanded.has(apt.id) || !!search.trim();
          const aptCollected = aptTenants.reduce(
            (s, t) => s + (paymentMap.get(t.id)?.total_paid ?? 0),
            0,
          );
          const aptExpected = aptTenants.length * (apt.rent_amount + apt.water_bill + apt.garbage_bill);

          const headerColor = isFullyPaid
            ? 'rgba(22,163,74,0.08)'
            : isPartiallyPaid
              ? 'rgba(217,119,6,0.08)'
              : 'rgba(220,38,38,0.06)';
          const borderColor = isFullyPaid
            ? 'rgba(22,163,74,0.25)'
            : isPartiallyPaid
              ? 'rgba(217,119,6,0.25)'
              : 'rgba(220,38,38,0.2)';
          const badgeColor = isFullyPaid
            ? '#15803d'
            : isPartiallyPaid
              ? '#b45309'
              : '#b91c1c';

          return (
            <div
              key={apt.id}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${borderColor}` }}
            >
              {/* Apartment header */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background: headerColor }}
                onClick={() => toggleApt(apt.id)}
              >
                {isOpen ? (
                  <ChevronDown size={16} style={{ color: badgeColor, flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={16} style={{ color: badgeColor, flexShrink: 0 }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-semibold text-sm"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontSize: '1rem' }}
                    >
                      {apt.name}
                    </span>
                    {apt.floor && (
                      <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Floor {apt.floor}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {formatCurrency(aptCollected)} of {formatCurrency(aptExpected)} collected
                  </div>
                </div>
                {/* Badge */}
                <span
                  className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: isFullyPaid
                      ? 'rgba(22,163,74,0.12)'
                      : isPartiallyPaid
                        ? 'rgba(217,119,6,0.12)'
                        : 'rgba(220,38,38,0.1)',
                    color: badgeColor,
                  }}
                >
                  {paidCount}/{aptTenants.length} paid
                </span>
              </button>

              {/* Tenant rows */}
              {isOpen && (
                <div style={{ background: 'var(--color-surface)' }}>
                  {aptTenants.map((tenant, idx) => {
                    const payment = paymentMap.get(tenant.id);
                    const expected =
                      apt.rent_amount + apt.water_bill + apt.garbage_bill;

                    return (
                      <div
                        key={tenant.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors"
                        style={{
                          borderTop: idx === 0 ? '1px solid var(--color-border)' : undefined,
                          borderBottom:
                            idx < aptTenants.length - 1
                              ? '1px solid var(--color-border)'
                              : undefined,
                          background: payment
                            ? 'rgba(22,163,74,0.03)'
                            : 'rgba(220,38,38,0.02)',
                        }}
                      >
                        {/* Status icon */}
                        <div className="flex-shrink-0">
                          {payment ? (
                            <CheckCircle size={18} style={{ color: '#16a34a' }} />
                          ) : (
                            <XCircle size={18} style={{ color: '#dc2626' }} />
                          )}
                        </div>

                        {/* Name + phone */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-medium text-sm truncate"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {tenant.full_name}
                          </p>
                          <p
                            className="text-xs truncate"
                            style={{ color: 'var(--color-text-subtle)' }}
                          >
                            {tenant.phone_number}
                          </p>
                        </div>

                        {/* Amount info */}
                        <div className="text-right hidden sm:block">
                          {payment ? (
                            <>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: 'var(--color-brand-light)' }}
                              >
                                {formatCurrency(payment.total_paid)}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: 'var(--color-text-subtle)' }}
                              >
                                {payment.payment_method}
                                {payment.reference_number
                                  ? ` · ${payment.reference_number}`
                                  : ''}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                              Expected {formatCurrency(expected)}
                            </p>
                          )}
                        </div>

                        {/* Action */}
                        {payment ? (
                          <span
                            className="flex-shrink-0 text-xs px-2 py-1 rounded-full"
                            style={{
                              background: 'rgba(22,163,74,0.1)',
                              color: '#15803d',
                              border: '1px solid rgba(22,163,74,0.2)',
                            }}
                          >
                            {payment.sms_sent ? '✓ SMS sent' : 'Paid'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRecordingFor(tenant.id);
                            }}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: 'var(--color-brand)',
                              color: '#fff',
                            }}
                          >
                            <CreditCard size={12} />
                            Record
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Tenants without apartment */}
        {noAptTenants.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div
              className="px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            >
              Tenants without apartment ({noAptTenants.length})
            </div>
            {noAptTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderTop: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <span className="text-sm flex-1" style={{ color: 'var(--color-text-muted)' }}>
                  {tenant.full_name}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  No apartment assigned
                </span>
              </div>
            ))}
          </div>
        )}

        {filteredGroups.length === 0 && noAptTenants.length === 0 && (
          <div
            className="text-center py-16 rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ color: 'var(--color-text-muted)' }}>
              {search ? 'No tenants match your search.' : 'No active tenants found.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Externally-controlled RecordPaymentModal ────────────────── */}
      {recordingFor && (
        <RecordPaymentModal
          tenants={allTenants}
          apartments={apartments}
          selectedMonth={selectedMonth}
          prefilledTenantId={recordingFor}
          isOpen={true}
          onClose={() => setRecordingFor(null)}
        />
      )}
    </div>
  );
}
