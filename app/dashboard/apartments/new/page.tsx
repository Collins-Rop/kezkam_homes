'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function NewApartmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: '',
    floor: '',
    description: '',
    rent_amount: '',
    water_bill: '',
    garbage_bill: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.rent_amount) {
      setError('Apartment name and rent amount are required.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('apartments').insert({
      name: form.name.trim(),
      floor: form.floor.trim() || null,
      description: form.description.trim() || null,
      rent_amount: parseFloat(form.rent_amount) || 0,
      water_bill: parseFloat(form.water_bill) || 0,
      garbage_bill: parseFloat(form.garbage_bill) || 0,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard/apartments');
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/apartments" className="btn-secondary !px-2 !py-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="page-title">New Apartment</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Add a unit to Kezkam Homes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212,133,26,0.15)' }}
          >
            <Building2 size={20} style={{ color: 'var(--color-brand)' }} />
          </div>
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Apartment Details
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Apartment Name *</label>
            <input
              className="input"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Apt 4B or Unit 12"
              required
            />
          </div>
          <div>
            <label className="label">Floor</label>
            <input
              className="input"
              name="floor"
              value={form.floor}
              onChange={handleChange}
              placeholder="e.g. Ground, 1st, 2nd"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Optional notes about this unit"
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
          <p className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Monthly Billing
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Rent Amount (KES) *</label>
              <input
                className="input"
                name="rent_amount"
                type="number"
                min="0"
                step="100"
                value={form.rent_amount}
                onChange={handleChange}
                placeholder="e.g. 15000"
                required
              />
            </div>
            <div>
              <label className="label">Water Bill (KES)</label>
              <input
                className="input"
                name="water_bill"
                type="number"
                min="0"
                step="50"
                value={form.water_bill}
                onChange={handleChange}
                placeholder="e.g. 800"
              />
            </div>
            <div>
              <label className="label">Garbage Bill (KES)</label>
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
          </div>

          {/* Bill preview */}
          {(form.rent_amount || form.water_bill || form.garbage_bill) && (
            <div
              className="mt-4 p-3 rounded-lg text-sm"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex justify-between py-0.5">
                <span style={{ color: 'var(--color-text-muted)' }}>Total / month</span>
                <span className="font-semibold" style={{ color: 'var(--color-brand-light)' }}>
                  KES {(
                    (parseFloat(form.rent_amount) || 0) +
                    (parseFloat(form.water_bill) || 0) +
                    (parseFloat(form.garbage_bill) || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/apartments" className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Saving…' : 'Add Apartment'}
          </button>
        </div>
      </form>
    </div>
  );
}
