'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';

interface Props {
  tenant: {
    id: string;
    full_name: string;
    phone_number: string;
    email?: string | null;
    national_id?: string | null;
    deposit_amount?: number | string | null;
    notes?: string | null;
    move_in_date?: string | null;
  };
}

export default function EditTenantModal({ tenant }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: tenant.full_name,
    phone_number: tenant.phone_number,
    email: tenant.email ?? '',
    national_id: tenant.national_id ?? '',
    deposit_amount: tenant.deposit_amount ? String(tenant.deposit_amount) : '',
    notes: tenant.notes ?? '',
    move_in_date: tenant.move_in_date ?? '',
  });

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save changes.');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary !px-3 !py-1.5 !text-xs"
      >
        <Pencil size={14} /> Edit Details
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-box w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Edit Tenant Details
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  placeholder="e.g. John Kamau"
                />
              </div>

              <div>
                <label className="label">Phone Number *</label>
                <input
                  className="input"
                  value={form.phone_number}
                  onChange={(e) => set('phone_number', e.target.value)}
                  placeholder="e.g. 0712345678"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="optional"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">National ID</label>
                  <input
                    className="input"
                    value={form.national_id}
                    onChange={(e) => set('national_id', e.target.value)}
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className="label">Deposit (KES)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.deposit_amount}
                    onChange={(e) => set('deposit_amount', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="label">Move-in Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.move_in_date}
                  onChange={(e) => set('move_in_date', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Any notes about this tenant..."
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#b91c1c' }}>{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
