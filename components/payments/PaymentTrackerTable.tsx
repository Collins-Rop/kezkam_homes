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
  Pencil,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import RecordPaymentModal from './RecordPaymentModal';
import type { Tenant, Apartment, Payment, TenantBalanceAdjustment } from '@/lib/supabase/types';
import { FLOOR_OPTIONS } from '@/lib/supabase/types';

const FLOOR_ORDER = FLOOR_OPTIONS.map((f) => f.value);

function getTenantPaymentStatus(
  tenantId: string,
  paymentMap: Map<string, Payment>,
  balances: Record<string, TenantBalance>,
): 'paid' | 'partial' | 'unpaid' {
  const balance = balances[tenantId];
  const hasPayment = paymentMap.has(tenantId) || (balance?.currentPaid ?? 0) > 0;
  if (balance) {
    if (balance.endingBalance <= 0) return 'paid';
    if (hasPayment) return 'partial';
    return 'unpaid';
  }
  return hasPayment ? 'paid' : 'unpaid';
}

type AptWithBuilding = Apartment & { buildings?: { id: string; name: string } | null };
type TenantWithApt = Tenant & { apartments: AptWithBuilding | null };

interface Props {
  tenants: TenantWithApt[];
  payments: Payment[];
  selectedMonth: string;
  allTenants: (Tenant & { apartments: unknown })[];
  apartments: Pick<Apartment, 'id' | 'name'>[];
  balances: Record<string, TenantBalance>;
  adjustments: TenantBalanceAdjustment[];
}

export interface TenantBalance {
  carriedBalance: number;
  currentAdjustment: number;
  currentDue: number;
  currentPaid: number;
  endingBalance: number;
}

interface AptGroup {
  apt: AptWithBuilding;
  tenants: TenantWithApt[];
}

interface BuildingGroup {
  buildingId: string;
  buildingName: string;
  paidGroups: AptGroup[];
  partialGroups: AptGroup[];
  unpaidGroups: AptGroup[];
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalCount: number;
  revenue: number;
}

export default function PaymentTrackerTable({
  tenants,
  payments,
  selectedMonth,
  allTenants,
  apartments,
  balances,
  adjustments,
}: Props) {
  const [search, setSearch] = useState('');
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());
  const [collapsedPaidSections, setCollapsedPaidSections] = useState<Set<string>>(new Set());
  const [collapsedPartialSections, setCollapsedPartialSections] = useState<Set<string>>(new Set());
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

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
          paidGroups: [],
          partialGroups: [],
          unpaidGroups: [],
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
          totalCount: 0,
          revenue: 0,
        });
      }

      const bg = bldMap.get(buildingId)!;
      const paidTenants: TenantWithApt[] = [];
      const partialTenants: TenantWithApt[] = [];
      const unpaidTenants: TenantWithApt[] = [];

      for (const t of aptTenants) {
        const status = getTenantPaymentStatus(t.id, paymentMap, balances);
        bg.totalCount++;
        if (status === 'paid') {
          bg.paidCount++;
          bg.revenue += paymentMap.get(t.id)?.total_paid ?? 0;
          paidTenants.push(t);
        } else if (status === 'partial') {
          bg.partialCount++;
          bg.revenue += paymentMap.get(t.id)?.total_paid ?? 0;
          partialTenants.push(t);
        } else {
          bg.unpaidCount++;
          unpaidTenants.push(t);
        }
      }

      if (paidTenants.length > 0) bg.paidGroups.push({ apt, tenants: paidTenants });
      if (partialTenants.length > 0) bg.partialGroups.push({ apt, tenants: partialTenants });
      if (unpaidTenants.length > 0) bg.unpaidGroups.push({ apt, tenants: unpaidTenants });
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
      bg.paidGroups.sort(sortByFloorThenName);
      bg.partialGroups.sort(sortByFloorThenName);
      bg.unpaidGroups.sort(sortByFloorThenName);
    }

    // Sort buildings: fully paid first, then partial progress, then alphabetically
    return result.sort((a: BuildingGroup, b: BuildingGroup) => {
      const aPct = a.totalCount > 0 ? (a.paidCount + a.partialCount) / a.totalCount : 0;
      const bPct = b.totalCount > 0 ? (b.paidCount + b.partialCount) / b.totalCount : 0;
      if (b.paidCount !== a.paidCount) return b.paidCount - a.paidCount;
      if (bPct !== aPct) return bPct - aPct;
      return a.buildingName.localeCompare(b.buildingName);
    });
  }, [tenants, paymentMap, balances]);

  // Overall stats
  const totalPaid = useMemo(
    () => tenants.filter((t) => getTenantPaymentStatus(t.id, paymentMap, balances) !== 'unpaid').length,
    [tenants, paymentMap, balances],
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
          paidGroups: filterGroups(bg.paidGroups),
          partialGroups: filterGroups(bg.partialGroups),
          unpaidGroups: filterGroups(bg.unpaidGroups),
        };
      })
      .filter((bg) => bg.paidGroups.length + bg.partialGroups.length + bg.unpaidGroups.length > 0);
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

  function togglePartialSection(id: string) {
    setCollapsedPartialSections((prev) => {
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
              {tenants.filter((t) => getTenantPaymentStatus(t.id, paymentMap, balances) === 'paid').length} fully paid ·{' '}
              {tenants.filter((t) => getTenantPaymentStatus(t.id, paymentMap, balances) === 'partial').length} partially paid ·{' '}
              {tenants.filter((t) => getTenantPaymentStatus(t.id, paymentMap, balances) === 'unpaid').length} unpaid
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
          const isPartialCollapsed = collapsedPartialSections.has(bg.buildingId);
          const paidOrPartialCount = bg.paidCount + bg.partialCount;
          const pct = bg.totalCount > 0 ? Math.round((paidOrPartialCount / bg.totalCount) * 100) : 0;
          const allBuildingPaid = bg.paidCount === bg.totalCount && bg.totalCount > 0;

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
                    {bg.paidCount} fully paid · {bg.partialCount} partial · {bg.unpaidCount} unpaid · {formatCurrency(bg.revenue)} collected
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

                  {/* ── Fully paid section ── */}
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
                          Fully Paid — {bg.paidGroups.reduce((s, g) => s + g.tenants.length, 0)} tenants
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
                              balances={balances}
                              onRecord={(id) => setRecordingFor(id)}
                              onEdit={(payment) => setEditingPayment(payment)}
                              showSearch={!!search.trim()}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Partially paid section ── */}
                  {bg.partialGroups.length > 0 && (
                    <div>
                      <button
                        type="button"
                        className="w-full px-5 py-2.5 flex items-center gap-2 text-left"
                        style={{
                          background: 'rgba(245,158,11,0.06)',
                          borderTop: bg.paidGroups.length > 0 ? '1px solid var(--color-border)' : 'none',
                          borderBottom: isPartialCollapsed ? 'none' : '1px solid rgba(245,158,11,0.18)',
                        }}
                        onClick={() => togglePartialSection(bg.buildingId)}
                      >
                        <CheckCircle size={14} style={{ color: '#d97706' }} />
                        <span
                          className="text-xs font-semibold uppercase tracking-wide flex-1"
                          style={{ color: '#b45309' }}
                        >
                          Partially Paid — {bg.partialGroups.reduce((s, g) => s + g.tenants.length, 0)} tenants
                        </span>
                        {isPartialCollapsed
                          ? <ChevronRight size={13} style={{ color: '#b45309' }} />
                          : <ChevronDown size={13} style={{ color: '#b45309' }} />
                        }
                      </button>
                      {!isPartialCollapsed && (
                        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                          {bg.partialGroups.map(({ apt, tenants: aptTenants }) => (
                            <AptBlock
                              key={apt.id}
                              apt={apt}
                              tenants={aptTenants}
                              paymentMap={paymentMap}
                              balances={balances}
                              onRecord={(id) => setRecordingFor(id)}
                              onEdit={(payment) => setEditingPayment(payment)}
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
                          borderTop: bg.paidGroups.length + bg.partialGroups.length > 0 ? '1px solid var(--color-border)' : 'none',
                          borderBottom: '1px solid rgba(220,38,38,0.12)',
                        }}
                      >
                        <XCircle size={14} style={{ color: '#dc2626' }} />
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: '#b91c1c' }}
                        >
                          Unpaid — {bg.unpaidGroups.reduce((s, g) => s + g.tenants.length, 0)} tenants
                        </span>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {bg.unpaidGroups.map(({ apt, tenants: aptTenants }) => (
                          <AptBlock
                            key={apt.id}
                            apt={apt}
                            tenants={aptTenants}
                            paymentMap={paymentMap}
                            balances={balances}
                            onRecord={(id) => setRecordingFor(id)}
                            onEdit={(payment) => setEditingPayment(payment)}
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
          adjustments={adjustments}
          prefilledTenantId={recordingFor}
          isOpen={true}
          onClose={() => setRecordingFor(null)}
        />
      )}

      {editingPayment && (
        <RecordPaymentModal
          tenants={allTenants}
          apartments={apartments}
          selectedMonth={selectedMonth}
          existingPayment={editingPayment}
          existingAdjustment={adjustments.find((a) => a.tenant_id === editingPayment.tenant_id) ?? null}
          adjustments={adjustments}
          isOpen={true}
          onClose={() => setEditingPayment(null)}
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
  balances,
  onRecord,
  onEdit,
  showSearch,
}: {
  apt: AptWithBuilding;
  tenants: TenantWithApt[];
  paymentMap: Map<string, Payment>;
  balances: Record<string, TenantBalance>;
  onRecord: (id: string) => void;
  onEdit: (payment: Payment) => void;
  showSearch: boolean;
}) {
  const [open, setOpen] = useState(showSearch);
  const paidCount = tenants.filter(
    (t) => getTenantPaymentStatus(t.id, paymentMap, balances) !== 'unpaid',
  ).length;
  const partialCount = tenants.filter(
    (t) => getTenantPaymentStatus(t.id, paymentMap, balances) === 'partial',
  ).length;
  const aptCollected = tenants.reduce((s, t) => s + (paymentMap.get(t.id)?.total_paid ?? 0), 0);
  const allPaidOrPartial = paidCount === tenants.length;
  const badgeColor = partialCount > 0 ? '#b45309' : allPaidOrPartial ? '#15803d' : '#b91c1c';

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
            background:
              partialCount > 0
                ? 'rgba(245,158,11,0.12)'
                : allPaidOrPartial
                ? 'rgba(22,163,74,0.1)'
                : 'rgba(220,38,38,0.08)',
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
            const balance = balances[tenant.id];
            const isCoveredByCredit = !payment && !!balance && balance.endingBalance <= 0;
            const status = getTenantPaymentStatus(tenant.id, paymentMap, balances);
            const isSettled = status === 'paid';
            const isPartial = status === 'partial';
            const statusColor = isSettled ? '#16a34a' : isPartial ? '#d97706' : '#dc2626';
            const statusBg = isSettled
              ? 'rgba(22,163,74,0.03)'
              : isPartial
              ? 'rgba(245,158,11,0.05)'
              : 'rgba(220,38,38,0.02)';

            return (
              <div
                key={tenant.id}
                className="flex flex-wrap items-center gap-3 px-7 py-3"
                style={{
                  borderTop: '1px solid var(--color-border)',
                  background: statusBg,
                }}
              >
                {status === 'unpaid'
                  ? <XCircle size={16} style={{ color: statusColor, flexShrink: 0 }} />
                  : <CheckCircle size={16} style={{ color: statusColor, flexShrink: 0 }} />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {tenant.full_name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-subtle)' }}>
                    {tenant.phone_number}
                  </p>
                  {balance && balance.carriedBalance !== 0 && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: balance.carriedBalance > 0 ? '#b91c1c' : '#15803d' }}
                    >
                      {balance.carriedBalance > 0
                        ? `Previous arrears ${formatCurrency(balance.carriedBalance)}`
                        : `Previous overpayment ${formatCurrency(Math.abs(balance.carriedBalance))}`}
                    </p>
                  )}
                  {balance && balance.currentAdjustment !== 0 && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: balance.currentAdjustment > 0 ? '#b45309' : '#15803d' }}
                    >
                      {balance.currentAdjustment > 0
                        ? `Manual arrears ${formatCurrency(balance.currentAdjustment)}`
                        : `Manual credit ${formatCurrency(Math.abs(balance.currentAdjustment))}`}
                    </p>
                  )}
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
                      {balance && balance.endingBalance !== 0 && (
                        <p
                          className="text-xs font-medium"
                          style={{ color: balance.endingBalance > 0 ? '#b45309' : '#15803d' }}
                        >
                          {balance.endingBalance > 0
                            ? `Still due ${formatCurrency(balance.endingBalance)}`
                            : `Credit ${formatCurrency(Math.abs(balance.endingBalance))}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Expected {formatCurrency(expected)}
                      </p>
                      {balance && balance.currentDue !== expected && (
                        <p
                          className="text-xs font-medium"
                          style={{ color: balance.currentDue > 0 ? '#b91c1c' : '#15803d' }}
                        >
                          {balance.currentDue > 0
                            ? `Due ${formatCurrency(balance.currentDue)}`
                            : `Credit ${formatCurrency(Math.abs(balance.currentDue))}`}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {payment ? (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isPartial && (
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: 'rgba(245,158,11,0.12)',
                          color: '#b45309',
                          border: '1px solid rgba(245,158,11,0.25)',
                        }}
                      >
                        Partial payment
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(payment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: isPartial ? 'rgba(245,158,11,0.12)' : 'rgba(22,163,74,0.1)',
                        color: isPartial ? '#b45309' : '#15803d',
                        border: isPartial ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(22,163,74,0.2)',
                      }}
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </div>
                ) : isCoveredByCredit ? (
                  <span
                    className="flex-shrink-0 text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }}
                  >
                    Covered by credit
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
