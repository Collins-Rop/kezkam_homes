'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function NewBuildingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Building name is required.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('buildings')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/apartments/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/apartments" className="btn-secondary !px-2 !py-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="page-title">New Building</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Add a building to Kezkam Homes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(176,138,36,0.12)' }}
          >
            <Building2 size={20} style={{ color: 'var(--color-brand)' }} />
          </div>
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Building Details
          </h2>
        </div>

        <div>
          <label className="label">Building Name *</label>
          <input
            className="input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Block A, Jasmine Court, Building 1"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            placeholder="Optional notes about this building"
          />
        </div>

        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          After creating the building, you can add individual units (bedsitters, 1-bed, 2-bed) with their floors and rents.
        </p>

        {error && (
          <p className="text-sm" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/apartments" className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Creating…' : 'Create Building'}
          </button>
        </div>
      </form>
    </div>
  );
}
