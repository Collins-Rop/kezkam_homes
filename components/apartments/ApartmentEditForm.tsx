'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Apartment, Tenant, TenantBalanceAdjustment, UnitType } from '@/lib/supabase/types';
import { FLOOR_OPTIONS, UNIT_TYPE_LABELS } from '@/lib/supabase/types';
import { Pencil, Trash2 } from 'lucide-react';

interface Props {
  apartment: Apartment;
  buildingId: string;
  activeTenants?: Tenant[];
  balanceAdjustments?: TenantBalanceAdjustment[];
  adjustmentMonth?: string;
}

export default function ApartmentEditForm({
  apartment,
  buildingId,
  activeTenants = [],
  balanceAdjustments = [],
  adjustmentMonth,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const adjustmentByTenant = new Map(balanceAdjustments.map((a) => [a.tenant_id, a]));

  const [form, setForm] = useState({
    name: apartment.name,
    floor: apartment.floor ?? 'Ground',
    unit_type: (apartment.unit_type ?? 'bedsitter') as UnitType,
    description: apartment.description ?? '',
    rent_amount: String(apartment.rent_amount),
    water_bill: String(apartment.water_bill),
    garbage_bill: String(apartment.garbage_bill),
    security_bill: String(apartment.security_bill ?? 0),
    is_occupied: apartment.is_occupied,
  });
  const [arrearsForm, setArrearsForm] = useState(() =>
    Object.fromEntries(
      activeTenants.map((tenant) => {
        const adjustment = adjustmentByTenant.get(tenant.id);
        return [
          tenant.id,
          {
            amount: adjustment ? String(adjustment.amount ?? '') : '',
            notes: adjustment?.notes ?? '',
          },
        ];
      }),
    ) as Record<string, { amount: string; notes: string }>,
  );

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  function handleArrearsChange(tenantId: string, field: 'amount' | 'notes', value: string) {
    setArrearsForm((current) => ({
      ...current,
      [tenantId]: {
        amount: current[tenantId]?.amount ?? '',
        notes: current[tenantId]?.notes ?? '',
        [field]: value,
      },
    }));
    setSuccess(false);
  }

  function arrearsChanged(tenantId: string) {
    const draft = arrearsForm[tenantId] ?? { amount: '', notes: '' };
    const adjustment = adjustmentByTenant.get(tenantId);
    const currentAmount = adjustment ? String(adjustment.amount ?? '') : '';
    const currentNotes = adjustment?.notes ?? '';
    return draft.amount !== currentAmount || draft.notes !== currentNotes;
  }

  async function saveCarryForwardArrears() {
    if (!adjustmentMonth) return;

    for (const tenant of activeTenants) {
      if (!arrearsChanged(tenant.id)) continue;

      const draft = arrearsForm[tenant.id] ?? { amount: '', notes: '' };
      const parsedAmount = parseFloat(draft.amount);
      const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
      const res = await fetch('/api/tenant-balance-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          apartment_id: apartment.id,
          adjustment_month: adjustmentMonth,
          amount,
          notes: draft.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to save carry-forward arrears for ${tenant.full_name}.`);
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { error: err } = await supabase
      .from('apartments')
      .update({
        name: form.name.trim(),
        floor: form.floor,
        unit_type: form.unit_type,
        description: form.description.trim() || null,
        rent_amount: parseFloat(form.rent_amount) || 0,
        water_bill: parseFloat(form.water_bill) || 0,
        garbage_bill: parseFloat(form.garbage_bill) || 0,
        security_bill: parseFloat(form.security_bill) || 0,
        is_occupied: form.is_occupied,
      })
      .eq('id', apartment.id);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    try {
      await saveCarryForwardArrears();
      setSuccess(true);
      router.refresh();
    } catch (arrearsErr) {
      setError(arrearsErr instanceof Error ? arrearsErr.message : 'Failed to save carry-forward arrears.');
    }
    setLoading(false);
  }

  async function handleDelete() {
    setDeleteLoading(true);
    const { error: err } = await supabase.from('apartments').delete().eq('id', apartment.id);
    if (err) { setError(err.message); setDeleteLoading(false); return; }
    window.location.href = `/dashboard/apartments/${buildingId}`;
  }

  const total =
    (parseFloat(form.rent_amount) || 0) +
    (parseFloat(form.water_bill) || 0) +
    (parseFloat(form.garbage_bill) || 0) +
    (parseFloat(form.security_bill) || 0);

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Pencil size={15} style={{ color: 'var(--color-brand)' }} />
        <h2 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
          Edit Unit
        </h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Unit Name</label>
          <input className="input" name="name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Floor</label>
          <select className="input" name="floor" value={form.floor} onChange={handleChange}>
            {FLOOR_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Unit Type</label>
          <select className="input" name="unit_type" value={form.unit_type} onChange={handleChange}>
            {(Object.entries(UNIT_TYPE_LABELS) as [UnitType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.is_occupied ? 'occupied' : 'vacant'}
            onChange={(e) => {
              setForm((f) => ({ ...f, is_occupied: e.target.value === 'occupied' }));
              setSuccess(false);
            }}
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>

        <div>
          <label className="label">Rent (KES)</label>
          <input className="input" name="rent_amount" type="number" min="0" value={form.rent_amount} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Water Bill (KES)</label>
          <input className="input" name="water_bill" type="number" min="0" value={form.water_bill} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Garbage Bill (KES)</label>
          <input className="input" name="garbage_bill" type="number" min="0" value={form.garbage_bill} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Security Bill (KES)</label>
          <input className="input" name="security_bill" type="number" min="0" value={form.security_bill} onChange={handleChange} />
        </div>

        {activeTenants.length > 0 && (
          <div
            className="space-y-3 rounded-xl p-3"
            style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Carry-forward arrears
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Add arrears or credit for the active tenant before updating payments.
              </p>
            </div>
            {activeTenants.map((tenant) => {
              const draft = arrearsForm[tenant.id] ?? { amount: '', notes: '' };
              return (
                <div key={tenant.id} className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {tenant.full_name}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="label">Arrears (KES)</label>
                      <input
                        className="input"
                        type="number"
                        value={draft.amount}
                        onChange={(e) => handleArrearsChange(tenant.id, 'amount', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="label">Notes</label>
                      <input
                        className="input"
                        value={draft.notes}
                        onChange={(e) => handleArrearsChange(tenant.id, 'notes', e.target.value)}
                        placeholder="e.g. Opening balance"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="flex justify-between text-sm py-2 px-3 rounded-lg"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Total / month</span>
          <span className="font-semibold" style={{ color: 'var(--color-brand-light)' }}>
            KES {total.toLocaleString()}
          </span>
        </div>

        {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
        {success && <p className="text-sm" style={{ color: '#4ade80' }}>Changes saved.</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger w-full justify-center text-xs"
          >
            <Trash2 size={14} /> Delete Unit
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-center" style={{ color: '#f87171' }}>
              Delete this unit and all its data?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="btn-danger flex-1 justify-center text-xs"
              >
                {deleteLoading ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
