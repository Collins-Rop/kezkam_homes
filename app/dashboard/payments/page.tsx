import { createClient } from '@/lib/supabase/server';
import { formatMonth, currentMonthISO } from '@/lib/utils';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import PaymentTrackerTable, { type TenantBalance } from '@/components/payments/PaymentTrackerTable';
import PaymentFilters from '@/components/payments/PaymentFilters';
import type { Apartment, Tenant, Payment } from '@/lib/supabase/types';
import { differenceInCalendarMonths, parseISO, startOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { month?: string; apartment?: string };
}

export default async function PaymentsPage({ searchParams }: Props) {
  const supabase = createClient();
  const selectedMonth = searchParams.month || currentMonthISO();

  const [{ data: tenantsRaw }, { data: monthPayments }, { data: previousPayments }, { data: apartments }] =
    await Promise.all([
      supabase
        .from('tenants')
        .select('*, apartments(*, buildings(id, name))')
        .eq('is_active', true)
        .order('full_name'),
      supabase.from('payments').select('*').eq('payment_month', selectedMonth),
      supabase.from('payments').select('*').lt('payment_month', selectedMonth),
      supabase.from('apartments').select('id, name').order('name'),
    ]);

  // Filter by apartment if requested
  const tenants = searchParams.apartment
    ? tenantsRaw?.filter((t) => t.apartment_id === searchParams.apartment)
    : tenantsRaw;

  const monthPaymentMap = new Map((monthPayments ?? []).map((p) => [p.tenant_id, p]));
  const previousPaymentsByTenant = new Map<string, Payment[]>();
  for (const payment of (previousPayments as Payment[]) ?? []) {
    const existing = previousPaymentsByTenant.get(payment.tenant_id) ?? [];
    existing.push(payment);
    previousPaymentsByTenant.set(payment.tenant_id, existing);
  }

  const balances: Record<string, TenantBalance> = {};
  const selectedMonthStart = startOfMonth(parseISO(selectedMonth));
  for (const tenant of (tenantsRaw ?? []) as (Tenant & { apartments: Apartment | null })[]) {
    const apt = tenant.apartments;
    if (!apt) continue;

    const monthlyBill =
      apt.rent_amount + apt.water_bill + apt.garbage_bill + (apt.security_bill ?? 0);
    const moveInMonth = startOfMonth(parseISO(tenant.move_in_date));
    const currentExpected = selectedMonthStart >= moveInMonth ? monthlyBill : 0;
    const priorMonths = Math.max(0, differenceInCalendarMonths(selectedMonthStart, moveInMonth));
    const priorExpected = priorMonths * monthlyBill;
    const priorPaid = (previousPaymentsByTenant.get(tenant.id) ?? []).reduce(
      (sum, payment) =>
        sum +
        payment.rent_paid +
        payment.water_paid +
        payment.garbage_paid +
        payment.security_paid,
      0,
    );
    const carriedBalance = priorExpected - priorPaid;
    const currentPayment = monthPaymentMap.get(tenant.id);
    const currentPaid = currentPayment
      ? currentPayment.rent_paid +
        currentPayment.water_paid +
        currentPayment.garbage_paid +
        currentPayment.security_paid
      : 0;

    balances[tenant.id] = {
      carriedBalance,
      currentDue: currentExpected + carriedBalance,
      currentPaid,
      endingBalance: currentExpected + carriedBalance - currentPaid,
    };
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {formatMonth(selectedMonth)} · tracking {tenants?.length ?? 0} tenants
          </p>
        </div>
        <RecordPaymentModal
          tenants={(tenantsRaw as (Tenant & { apartments: unknown })[]) ?? []}
          apartments={apartments ?? []}
          selectedMonth={selectedMonth}
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <PaymentFilters
        selectedMonth={selectedMonth}
        selectedApartment={searchParams.apartment ?? ''}
        apartments={apartments ?? []}
      />

      {/* ── Apartment-grouped tracker ─────────────────────────────────── */}
      <PaymentTrackerTable
        tenants={(tenants as (Tenant & { apartments: Apartment | null })[]) ?? []}
        payments={(monthPayments as Payment[]) ?? []}
        selectedMonth={selectedMonth}
        allTenants={(tenantsRaw as (Tenant & { apartments: unknown })[]) ?? []}
        apartments={apartments ?? []}
        balances={balances}
      />
    </div>
  );
}
