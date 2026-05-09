'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
  CreditCard,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import RecordPaymentModal from './RecordPaymentModal';
import type { Tenant, Apartment, Payment } from '@/lib/supabase/types';
import { FLOOR_OPTIONS } from '@/lib/supabase/types';

const FLOOR_ORDER = FLOOR_OPTIONS.map((f) => f.value);

type AptWithBuilding = Apartment & { buildings?: { id: string; name: string } | null };
type TenantWithApt = Tenant & { apartments: AptWithBuilding | null };

interface Props {
  tenants: TenantWithApt[];
  payments: Payment[];
  selectedMonth: string;
  allTenants: (Tenant & { apartments: unknown })[];
  apartments: Pick<Apartment, 'id' | 'name'>[];
}

interface AptGroup {
  apt: AptWithBuilding;
  tenants: TenantWithApt[];
}

interface BuildingGroup {
  buildingId: string;
  buildingName: string;
  unpaidGroups: AptGroup[]; // apartments where at least one tenant hasn't paid
  paidGroups: AptGroup[];   // apartments where every tenant has paid
  paidCount: number;
  totalCount: number;
  revenue: number;
}

export default function PaymentTrackerTable({
  tenants,
  payments,
  selectedMonth,
  allTenants,
  apartments,
}: Props) {
  const [search, setSearch] = useState('');
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());
  const [collapsedPaidSections, setCollapsedPaidSections] = useState<Set<string>>(new Set());
  const [recordingFor, setRecordingFor] = useState<string | null>(null);

  const paymentMap = useMemo(
    () => new Map(payments.map((p) => [p.tenant_id, p])),
    [payments],
  );

  // Build building → apartment → tenant groups
  const buildingGroups = useMemo((): BuildingGroup[] => {
    // Step 1: group tenants by apartment
    const aptMap = new Map<string, AptGroup>();
    for (const t of tenants) {
      if (!t.apartment_id || !t.apartments) continue;
      if (!aptMap.has(t.apartment_id)) {
        aptMap.set(t.apartment_id, { apt: t.apartments, tenants: [] });
      }
      aptMap.get(t.apartment_id)!.tenants.push(t);
    }

    // Step 2: group apartments by building
    const bldMap = new Map<string, BuildingGroup>();
    for (const { apt, tenants: aptTenants } of Array.from(aptMap.values())) {
      const buildingId = apt.building_id ?? '__none__';
      const buildingName = apt.buildings?.name ?? 'No Building';

      if (!bldMap.has(buildingId)) {
        bldMap.set(buildingId, {
          buildingId,
          buildingName,
          unpaidGroups: [],
          paidGroups: [],
          paidCount: 0,
          totalCount: 0,
          revenue: 0,
        });
      }

      const bg = bldMap.get(buildingId)!;
      const allPaid = aptTenants.every((t: TenantWithApt) => paymentMap.has(t.id));

      if (allPaid) {
        bg.paidGroups.push({ apt, tenants: aptTenants });
      } else {
        bg.unpaidGroups.push({ apt, tenants: aptTenants });
      }

      for (const t of aptTenants) {
        bg.totalCount++;
        if (paymentMap.has(t.id)) {
          bg.paidCount++;
          bg.revenue += paymentMap.get(t.id)!.total_paid ?? 0;
        }
      }
    }

    const result: BuildingGroup[] = Array.from(bldMap.values());

    // Sort apartments within each building: floor first, then name
    function sortByFloorThenName(a: AptGroup, b: AptGroup): number {
      const ai = FLOOR_ORDER.indexOf(a.apt.floor ?? '');
      const bi = FLOOR_ORDER.indexOf(b.apt.floor ?? '');
      const floorCmp = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      if (floorCmp !== 0) return floorCmp;
      return a.apt.name.localeCompare(b.apt.name);
    }
    for (const bg of result) {
      bg.unpaidGroups.sort(sortByFloorThenName);
      bg.paidGroups.sort(sortByFloorThenName);
    }

    // Sort buildings: fully paid first, then by paid count descending, then alphabetically
    return result.sort((a: BuildingGroup, b: BuildingGroup) => {
      const aPct = a.totalCount > 0 ? a.paidCount / a.totalCount : 0;
      const bPct = b.totalCount > 0 ? b.paidCount / b.totalCount : 0;
      if (bPct !== aPct) return bPct - aPct;
      return a.buildingName.localeCompare(b.buildingName);
    });
  }, [tenants, paymentMap]);

  // Overall stats
  const totalPaid = useMemo(
    () => tenants.filter((t) => paymentMap.has(t.id)).length,
    [tenants, paymentMap],
  );
  const totalRevenue = useMemo(
    () => payments.reduce((s, p) => s + (p.total_paid ?? 0), 0),
    [payments],
  );

  // Apply search filter across all groups
  const filteredBuildingGroups = useMemo(() => {
    if (!search.trim()) return buildingGroups;
    const q = search.toLowerCase();
    return buildingGroups
      .map((bg) => {
        function filterGroups(groups: AptGroup[]): AptGroup[] {
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
        }
        return {
          ...bg,
          unpaidGroups: filterGroups(bg.unpaidGroups),
          paidGroups: filterGroups(bg.paidGroups),
        };
      })
      .filter((bg) => bg.unpaidGroups.length + bg.paidGroups.length > 0);
  }, [buildingGroups, search]);

  const noAptTenants = useMemo(() => tenants.filter((t) => !t.apartment_id), [tenants]);

  function toggleBuilding(id: string) {
    setCollapsedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePaidSection(id: string) {
    setCollapsedPaidSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
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
            {tenants.length > 0 ? Math.round((totalPaid / tenants.length) * 100) : 0}% collected
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '8px', background: 'var(--color-surface-2)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${tenants.length > 0 ? (totalPaid / tenants.length) * 100 : 0}%`,
              background:
                totalPaid === tenants.length && tenants.length > 0
                  ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                  : 'linear-gradient(90deg,var(--color-brand-dark),var(--color-brand),var(--color-brand-light))',
            }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
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

      {/* Building groups */}
      <div className="space-y-5">
        {filteredBuildingGroups.map((bg) => {
          const isCollapsed = collapsedBuildings.has(bg.buildingId);
          const isPaidCollapsed = collapsedPaidSections.has(bg.buildingId);
          const unpaidCount = bg.totalCount - bg.paidCount;
          const pct = bg.totalCount > 0 ? Math.round((bg.paidCount / bg.totalCount) * 100) : 0;
          const allBuildingPaid = unpaidCount === 0 && bg.totalCount > 0;

          return (
            <div
              key={bg.buildingId}
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {/* Building header */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
                style={{
                  background: allBuildingPaid
                    ? 'rgba(22,163,74,0.06)'
                    : 'rgba(212,133,26,0.06)',
                  borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
                }}
                onClick={() => toggleBuilding(bg.buildingId)}
              >
                <Building2
                  size={18}
                  style={{ color: allBuildingPaid ? '#16a34a' : 'var(--color-brand)', flexShrink: 0 }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-base truncate"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    {bg.buildingName}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {bg.paidCount}/{bg.totalCount} tenants paid · {formatCurrency(bg.revenue)} collected
                  </div>
                </div>
                {/* Mini progress */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ width: '60px', height: '6px', background: 'var(--color-surface-2)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: allBuildingPaid ? '#16a34a' : 'var(--color-brand)',
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold w-8 text-right"
                    style={{ color: allBuildingPaid ? '#16a34a' : 'var(--color-brand)' }}
                  >
                    {pct}%
                  </span>
                  {isCollapsed
                    ? <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)' }} />
                    : <ChevronDown size={16} style={{ color: 'var(--color-text-subtle)' }} />
                  }
                </div>
              </button>

              {!isCollapsed && (
                <div style={{ background: 'var(--color-surface)' }}>

                  {/* ── Paid section ── */}
                  {bg.paidGroups.length > 0 && (
                    <div>
                      <button
                        type="button"
                        className="w-full px-5 py-2.5 flex items-center gap-2 text-left"
                        style={{
                          background: 'rgba(22,163,74,0.04)',
                          borderBottom: isPaidCollapsed ? 'none' : '1px solid rgba(22,163,74,0.12)',
                        }}
                        onClick={() => togglePaidSection(bg.buildingId)}
                      >
                        <CheckCircle size={14} style={{ color: '#16a34a' }} />
                        <span
                          className="text-xs font-semibold uppercase tracking-wide flex-1"
                          style={{ color: '#15803d' }}
                        >
                          Paid — {bg.paidGroups.reduce((s, g) => s + g.tenants.length, 0)} tenants
                        </span>
                        {isPaidCollapsed
                          ? <ChevronRight size={13} style={{ color: '#15803d' }} />
                          : <ChevronDown size={13} style={{ color: '#15803d' }} />
                        }
                      </button>
                      {!isPaidCollapsed && (
                        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                          {bg.paidGroups.map(({ apt, tenants: aptTenants }) => (
                            <AptBlock
                              key={apt.id}
                              apt={apt}
                              tenants={aptTenants}
                              paymentMap={paymentMap}
                              onRecord={(id) => setRecordingFor(id)}
                              showSearch={!!search.trim()}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Unpaid section ── */}
                  {bg.unpaidGroups.length > 0 && (
                    <div>
                      <div
                        className="px-5 py-2.5 flex items-center gap-2"
                        style={{
                          background: 'rgba(220,38,38,0.04)',
                          borderTop: bg.paidGroups.length > 0 ? '1px solid var(--color-border)' : 'none',
                          borderBottom: '1px solid rgba(220,38,38,0.12)',
                        }}
                      >
                        <XCircle size={14} style={{ color: '#dc2626' }} />
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: '#b91c1c' }}
                        >
                          Unpaid — {bg.unpaidGroups.reduce((s, g) => s + g.tenants.filter((t) => !paymentMap.has(t.id)).length, 0)} tenants
                        </span>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {bg.unpaidGroups.map(({ apt, tenants: aptTenants }) => (
                          <AptBlock
                            key={apt.id}
                            apt={apt}
                            tenants={aptTenants}
                            paymentMap={paymentMap}
                            onRecord={(id) => setRecordingFor(id)}
                            showSearch={!!search.trim()}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
                style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
              >
                <span className="text-sm flex-1" style={{ color: 'var(--color-text-muted)' }}>{tenant.full_name}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>No apartment assigned</span>
              </div>
            ))}
          </div>
        )}

        {filteredBuildingGroups.length === 0 && noAptTenants.length === 0 && (
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

      {/* Externally-controlled RecordPaymentModal */}
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

// ── Apartment block ────────────────────────────────────────────────────────────
function AptBlock({
  apt,
  tenants,
  paymentMap,
  onRecord,
  showSearch,
}: {
  apt: AptWithBuilding;
  tenants: TenantWithApt[];
  paymentMap: Map<string, Payment>;
  onRecord: (id: string) => void;
  showSearch: boolean;
}) {
  const [open, setOpen] = useState(showSearch);
  const paidCount = tenants.filter((t) => paymentMap.has(t.id)).length;
  const aptCollected = tenants.reduce((s, t) => s + (paymentMap.get(t.id)?.total_paid ?? 0), 0);
  const allPaid = paidCount === tenants.length;
  const badgeColor = allPaid ? '#15803d' : '#b91c1c';

  return (
    <div>
      {/* Apt header row */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:opacity-90"
        style={{ background: 'var(--color-surface)' }}
        onClick={() => setOpen((v) => !v)}
      >
        {open
          ? <ChevronDown size={14} style={{ color: badgeColor, flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: badgeColor, flexShrink: 0 }} />
        }
        <span className="flex-1 font-medium text-sm" style={{ color: 'var(--color-text)' }}>
          {apt.name}
          {apt.floor && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-subtle)' }}>
              {FLOOR_OPTIONS.find((f) => f.value === apt.floor)?.label ?? apt.floor}
            </span>
          )}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {formatCurrency(aptCollected)}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: allPaid ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.08)',
            color: badgeColor,
          }}
        >
          {paidCount}/{tenants.length}
        </span>
      </button>

      {/* Tenant rows */}
      {open && (
        <div>
          {tenants.map((tenant) => {
            const payment = paymentMap.get(tenant.id);
            const expected = apt.rent_amount + apt.water_bill + apt.garbage_bill + (apt.security_bill ?? 0);

            return (
              <div
                key={tenant.id}
                className="flex flex-wrap items-center gap-3 px-7 py-3"
                style={{
                  borderTop: '1px solid var(--color-border)',
                  background: payment ? 'rgba(22,163,74,0.03)' : 'rgba(220,38,38,0.02)',
                }}
              >
                {payment
                  ? <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  : <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {tenant.full_name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-subtle)' }}>
                    {tenant.phone_number}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  {payment ? (
                    <>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-light)' }}>
                        {formatCurrency(payment.total_paid)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        {payment.payment_method}{payment.reference_number ? ` · ${payment.reference_number}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      Expected {formatCurrency(expected)}
                    </p>
                  )}
                </div>
                {payment ? (
                  <span
                    className="flex-shrink-0 text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }}
                  >
                    {payment.sms_sent ? '✓ SMS sent' : 'Paid'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRecord(tenant.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--color-brand)', color: '#fff' }}
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
}
