'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Loader2 } from 'lucide-react';
import { FLOOR_OPTIONS, UNIT_TYPE_LABELS, type UnitType } from '@/lib/supabase/types';

interface Props {
  buildingId: string;
}

export default function AddUnitModal({ buildingId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    floor: 'Ground',
    unit_type: 'bedsitter' as UnitType,
    rent_amount: '',
    water_bill: '',
    garbage_bill: '',
    security_bill: '',
    description: '',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function close() {
    setOpen(false);
    setError('');
    setForm({
      name: '',
      floor: 'Ground',
      unit_type: 'bedsitter',
      rent_amount: '',
      water_bill: '',
      garbage_bill: '',
      security_bill: '',
      description: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.rent_amount) {
      setError('Unit name and rent amount are required.');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: err } = await supabase.from('apartments').insert({
      building_id: buildingId,
      name: form.name.trim(),
      floor: form.floor,
      unit_type: form.unit_type,
      rent_amount: parseFloat(form.rent_amount) || 0,
      water_bill: parseFloat(form.water_bill) || 0,
      garbage_bill: parseFloat(form.garbage_bill) || 0,
      security_bill: parseFloat(form.security_bill) || 0,
      description: form.description.trim() || null,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      close();
      router.refresh();
    }
  }

  const total =
    (parseFloat(form.rent_amount) || 0) +
    (parseFloat(form.water_bill) || 0) +
    (parseFloat(form.garbage_bill) || 0) +
    (parseFloat(form.security_bill) || 0);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> Add Unit
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-box w-full max-w-md animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Add Unit
              </h2>
              <button
                onClick={close}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Unit Name / Number *</label>
                  <input
                    className="input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Unit A1, Room 3, Flat 2B"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">Floor</label>
                  <select className="input" name="floor" value={form.floor} onChange={handleChange}>
                    {FLOOR_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Unit Type</label>
                  <select className="input" name="unit_type" value={form.unit_type} onChange={handleChange}>
                    {(Object.entries(UNIT_TYPE_LABELS) as [UnitType, string][]).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <p className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Monthly Billing
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Rent (KES) *</label>
                    <input
                      className="input"
                      name="rent_amount"
                      type="number"
                      min="0"
                      step="100"
                      value={form.rent_amount}
                      onChange={handleChange}
                      placeholder="e.g. 8000"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Water (KES)</label>
                      <input
                        className="input"
                        name="water_bill"
                        type="number"
                        min="0"
                        step="50"
                        value={form.water_bill}
                        onChange={handleChange}
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="label">Garbage (KES)</label>
                      <input
                        className="input"
                        name="garbage_bill"
                        type="number"
                        min="0"
                        step="50"
                        value={form.garbage_bill}
                        onChange={handleChange}
                        placeholder="e.g. 300"
                      />
                    </div>
                    <div>
                      <label className="label">Security (KES)</label>
                      <input
                        className="input"
                        name="security_bill"
                        type="number"
                        min="0"
                        step="50"
                        value={form.security_bill}
                        onChange={handleChange}
                        placeholder="e.g. 500"
                      />
                    </div>
                  </div>

                  {total > 0 && (
                    <div
                      className="flex justify-between text-sm py-2 px-3 rounded-lg"
                      style={{ background: 'var(--color-surface-2)' }}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>Total / month</span>
                      <span className="font-semibold" style={{ color: 'var(--color-brand-light)' }}>
                        KES {total.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
