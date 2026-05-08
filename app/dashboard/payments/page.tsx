import { createClient } from '@/lib/supabase/server';
import { formatMonth, currentMonthISO } from '@/lib/utils';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import PaymentTrackerTable from '@/components/payments/PaymentTrackerTable';
import PaymentFilters from '@/components/payments/PaymentFilters';
import type { Apartment, Tenant, Payment } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { month?: string; apartment?: string };
}

export default async function PaymentsPage({ searchParams }: Props) {
  const supabase = createClient();
  const selectedMonth = searchParams.month || currentMonthISO();

  const [{ data: tenantsRaw }, { data: monthPayments }, { data: apartments }] =
    await Promise.all([
      supabase
        .from('tenants')
        .select('*, apartments(*, buildings(id, name))')
        .eq('is_active', true)
        .order('full_name'),
      supabase.from('payments').select('*').eq('payment_month', selectedMonth),
      supabase.from('apartments').select('id, name').order('name'),
    ]);

  // Filter by apartment if requested
  const tenants = searchParams.apartment
    ? tenantsRaw?.filter((t) => t.apartment_id === searchParams.apartment)
    : tenantsRaw;

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
      />
    </div>
  );
}
