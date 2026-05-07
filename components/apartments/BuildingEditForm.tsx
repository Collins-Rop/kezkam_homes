'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Building } from '@/lib/supabase/types';
import { Pencil, Trash2 } from 'lucide-react';

export default function BuildingEditForm({ building }: { building: Building }) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: building.name,
    description: building.description ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { error: err } = await supabase
      .from('buildings')
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      .eq('id', building.id);

    if (err) { setError(err.message); }
    else { setSuccess(true); router.refresh(); }
    setLoading(false);
  }

  async function handleDelete() {
    setDeleteLoading(true);
    const { error: err } = await supabase.from('buildings').delete().eq('id', building.id);
    if (err) { setError(err.message); setDeleteLoading(false); return; }
    window.location.href = '/dashboard/apartments';
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Pencil size={15} style={{ color: 'var(--color-brand)' }} />
        <h2 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
          Edit Building
        </h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            placeholder="Optional notes"
          />
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
            <Trash2 size={14} /> Delete Building
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-center" style={{ color: '#f87171' }}>
              This will delete the building and all its units. Are you sure?
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
