'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, CreditCard, MessageCircle, Zap } from 'lucide-react';
import { monthOptions, formatCurrency } from '@/lib/utils';
import type { Tenant, Apartment } from '@/lib/supabase/types';

interface Props {
  tenants: (Tenant & { apartments: unknown })[];
  apartments: Pick<Apartment, 'id' | 'name'>[];
  selectedMonth: string;
  /** Pre-select a specific tenant and open the modal (external control) */
  prefilledTenantId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

// ─── M-Pesa SMS parser ────────────────────────────────────────────────────────
// Handles both "received" (paybill/till) and "sent to" confirmation messages.
function parseMpesaSMS(sms: string): { reference?: string; amount?: number } {
  // Transaction code — 10 alphanumeric chars near start of message
  const refMatch = sms.match(/\b([A-Z0-9]{10})\b/);
  // First Ksh amount — the transaction amount (not the balance)
  const amountMatch = sms.match(/Ksh\s*([\d,]+(?:\.\d+)?)/i);

  return {
    reference: refMatch?.[1],
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined,
  };
}

// Distribute a total amount into rent / water / garbage based on apartment bills
function distributeAmount(
  total: number,
  apt: Record<string, number>,
): { rent: string; water: string; garbage: string; security: string } {
  const rent = apt.rent_amount ?? 0;
  const water = apt.water_bill ?? 0;
  const garbage = apt.garbage_bill ?? 0;
  const security = apt.security_bill ?? 0;
  const expected = rent + water + garbage + security;

  if (total >= expected) {
    return {
      rent: String(rent),
      water: String(water),
      garbage: String(garbage),
      security: String(security),
    };
  }

  // Partial — fill rent first, then water, then garbage, then security
  let remaining = total;
  const rentPaid = Math.min(remaining, rent);
  remaining -= rentPaid;
  const waterPaid = Math.min(remaining, water);
  remaining -= waterPaid;
  const garbagePaid = Math.min(remaining, garbage);
  remaining -= garbagePaid;
  const securityPaid = Math.min(remaining, security);

  return {
    rent: String(rentPaid),
    water: String(waterPaid),
    garbage: String(garbagePaid),
    security: String(securityPaid),
  };
}

const EMPTY_FORM = (month: string) => ({
  tenant_id: '',
  payment_month: month,
  rent_paid: '',
  water_paid: '',
  garbage_paid: '',
  security_paid: '',
  payment_method: 'M-Pesa',
  reference_number: '',
  notes: '',
  mpesa_message: '',
});

export default function RecordPaymentModal({
  tenants,
  selectedMonth,
  prefilledTenantId,
  isOpen,
  onClose,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [smsText, setSmsText] = useState('');
  const [smsMode, setSmsMode] = useState(false);
  const months = monthOptions(12);

  const [form, setForm] = useState(EMPTY_FORM(selectedMonth));

  // Determine if we're externally controlled
  const controlled = isOpen !== undefined;
  const open = controlled ? isOpen : internalOpen;

  // When the external caller sets isOpen=true with a prefilled tenant, populate the form
  useEffect(() => {
    if (controlled && isOpen && prefilledTenantId) {
      prefillFromTenant(prefilledTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefilledTenantId]);

  const selectedTenant = tenants.find((t) => t.id === form.tenant_id);
  const apt = selectedTenant?.apartments as Record<string, number> | null;

  function prefillFromTenant(tenantId: string) {
    const tenant = tenants.find((t) => t.id === tenantId);
    const a = tenant?.apartments as Record<string, number> | null;
    if (a) {
      setForm((f) => ({
        ...f,
        tenant_id: tenantId,
        payment_month: selectedMonth,
        rent_paid: String(a.rent_amount ?? ''),
        water_paid: String(a.water_bill ?? ''),
        garbage_paid: String(a.garbage_bill ?? ''),
        security_paid: String(a.security_bill ?? ''),
      }));
    } else {
      setForm((f) => ({ ...f, tenant_id: tenantId, payment_month: selectedMonth }));
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    if (name === 'tenant_id') {
      prefillFromTenant(value);
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handlePasteSMS() {
    const parsed = parseMpesaSMS(smsText);
    if (!parsed.reference && !parsed.amount) {
      setError('Could not read the SMS. Please fill in the details manually.');
      return;
    }

    const a = apt ?? ({} as Record<string, number>);
    const distributed = parsed.amount
      ? distributeAmount(parsed.amount, a)
      : { rent: form.rent_paid, water: form.water_paid, garbage: form.garbage_paid, security: form.security_paid };

    setForm((f) => ({
      ...f,
      reference_number: parsed.reference ?? f.reference_number,
      rent_paid: distributed.rent,
      water_paid: distributed.water,
      garbage_paid: distributed.garbage,
      security_paid: distributed.security,
      mpesa_message: smsText,
    }));
    setError('');
    setSmsMode(false);
    setSmsText('');
  }

  function closeModal() {
    if (controlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
    setError('');
    setSuccess('');
    setSmsMode(false);
    setSmsText('');
    setForm(EMPTY_FORM(selectedMonth));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tenant_id) {
      setError('Please select a tenant.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const tenant = tenants.find((t) => t.id === form.tenant_id);
    if (!tenant?.apartment_id) {
      setError('Selected tenant has no apartment assigned.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: form.tenant_id,
        apartment_id: tenant.apartment_id,
        payment_month: form.payment_month,
        rent_paid: parseFloat(form.rent_paid) || 0,
        water_paid: parseFloat(form.water_paid) || 0,
        garbage_paid: parseFloat(form.garbage_paid) || 0,
        security_paid: parseFloat(form.security_paid) || 0,
        payment_method: form.payment_method,
        reference_number: form.reference_number || null,
        notes: form.notes || null,
        mpesa_message: form.mpesa_message || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      setLoading(false);
      return;
    }

    setSuccess(`Payment recorded! SMS confirmation sent to ${tenant.full_name}.`);
    setLoading(false);
    router.refresh();
    setTimeout(closeModal, 2000);
  }

  const total =
    (parseFloat(form.rent_paid) || 0) +
    (parseFloat(form.water_paid) || 0) +
    (parseFloat(form.garbage_paid) || 0) +
    (parseFloat(form.security_paid) || 0);

  return (
    <>
      {/* Standalone trigger button — only when not externally controlled */}
      {!controlled && (
        <button
          onClick={() => setInternalOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} /> Record Payment
        </button>
      )}

      {open && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="modal-box w-full"
            style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CreditCard size={18} style={{ color: 'var(--color-brand)' }} />
                <h2
                  className="font-semibold text-lg"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Record Payment
                </h2>
              </div>
              <button onClick={closeModal} className="btn-secondary !p-1.5">
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="text-center py-10 space-y-3">
                <div className="text-5xl">✅</div>
                <p className="font-semibold" style={{ color: '#15803d' }}>
                  {success}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tenant selector */}
                <div>
                  <label className="label">Tenant *</label>
                  <select
                    name="tenant_id"
                    value={form.tenant_id}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="">Select tenant…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} —{' '}
                        {(t.apartments as { name: string } | null)?.name ?? 'No apt'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div>
                  <label className="label">Payment Month *</label>
                  <select
                    name="payment_month"
                    value={form.payment_month}
                    onChange={handleChange}
                    className="input"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expected amounts hint */}
                {apt && (
                  <div
                    className="text-xs px-3 py-2.5 rounded-lg"
                    style={{
                      background: 'rgba(212,133,26,0.08)',
                      border: '1px solid rgba(212,133,26,0.2)',
                      color: 'var(--color-brand-light)',
                    }}
                  >
                    Expected: Rent {formatCurrency(apt.rent_amount)} · Water{' '}
                    {formatCurrency(apt.water_bill)} · Garbage{' '}
                    {formatCurrency(apt.garbage_bill)} · Security{' '}
                    {formatCurrency(apt.security_bill ?? 0)} ={' '}
                    <strong>
                      {formatCurrency(
                        apt.rent_amount + apt.water_bill + apt.garbage_bill + (apt.security_bill ?? 0),
                      )}
                    </strong>
                  </div>
                )}

                {/* ── M-Pesa SMS auto-fill ──────────────────────────── */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setSmsMode((v) => !v)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                    style={{
                      background: smsMode
                        ? 'rgba(59,130,246,0.08)'
                        : 'var(--color-surface-2)',
                      color: smsMode ? '#2563eb' : 'var(--color-text-muted)',
                    }}
                  >
                    <Zap size={15} />
                    Auto-fill from M-Pesa SMS
                    <span className="ml-auto text-xs opacity-60">
                      {smsMode ? 'Cancel' : 'Tap to paste'}
                    </span>
                  </button>

                  {smsMode && (
                    <div className="p-3 space-y-2" style={{ background: 'var(--color-surface-2)' }}>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Paste the M-Pesa confirmation SMS you received:
                      </p>
                      <textarea
                        className="input resize-none !text-xs"
                        rows={4}
                        placeholder={
                          'e.g. Confirmed. QAB1234XYZ Ksh5,000 received from\n0712345678 JOHN DOE on 5/1/26 at 2:30 PM…'
                        }
                        value={smsText}
                        onChange={(e) => setSmsText(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handlePasteSMS}
                        className="btn-primary w-full justify-center !py-2"
                        disabled={!smsText.trim()}
                      >
                        <MessageCircle size={14} /> Extract Details
                      </button>
                    </div>
                  )}
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Rent (KES)</label>
                    <input
                      className="input"
                      name="rent_paid"
                      type="number"
                      min="0"
                      value={form.rent_paid}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Water (KES)</label>
                    <input
                      className="input"
                      name="water_paid"
                      type="number"
                      min="0"
                      value={form.water_paid}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Garbage (KES)</label>
                    <input
                      className="input"
                      name="garbage_paid"
                      type="number"
                      min="0"
                      value={form.garbage_paid}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Security (KES)</label>
                    <input
                      className="input"
                      name="security_paid"
                      type="number"
                      min="0"
                      value={form.security_paid}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                </div>

                {total > 0 && (
                  <div
                    className="flex justify-between text-sm px-3 py-2.5 rounded-lg font-medium"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>Total</span>
                    <span style={{ color: 'var(--color-brand-light)', fontSize: '1rem' }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                )}

                {/* Method + Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Payment Method</label>
                    <select
                      name="payment_method"
                      value={form.payment_method}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">M-Pesa Code / Ref</label>
                    <input
                      className="input"
                      name="reference_number"
                      value={form.reference_number}
                      onChange={handleChange}
                      placeholder="e.g. QAB1234XYZ"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input resize-none"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Optional"
                  />
                </div>

                {error && (
                  <p
                    className="text-sm px-3 py-2 rounded-lg"
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      color: '#b91c1c',
                      border: '1px solid rgba(220,38,38,0.15)',
                    }}
                  >
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 justify-center"
                  >
                    {loading ? 'Saving…' : 'Record & Send SMS'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
