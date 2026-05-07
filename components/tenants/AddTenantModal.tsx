'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface Props {
  apartmentId: string;
}

export default function AddTenantModal({ apartmentId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    national_id: '',
    email: '',
    move_in_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function closeModal() {
    setOpen(false);
    setError('');
    setForm({
      full_name: '',
      phone_number: '',
      national_id: '',
      email: '',
      move_in_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.phone_number) {
      setError('Name and phone number are required.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('tenants').insert({
      apartment_id: apartmentId,
      full_name: form.full_name.trim(),
      phone_number: normalizePhone(form.phone_number.trim()),
      national_id: form.national_id.trim() || null,
      email: form.email.trim() || null,
      move_in_date: form.move_in_date,
      notes: form.notes.trim() || null,
      is_active: true,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    closeModal();
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary !px-3 !py-1.5 !text-xs">
        <Plus size={14} /> Add Tenant
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Add Tenant
              </h2>
              <button onClick={closeModal} className="btn-secondary !p-1.5">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" name="full_name" value={form.full_name} onChange={handleChange} placeholder="e.g. Jane Mwangi" required />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input className="input" name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="e.g. 0712345678 or +254712345678" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">National ID</label>
                  <input className="input" name="national_id" value={form.national_id} onChange={handleChange} placeholder="Optional" />
                </div>
                <div>
                  <label className="label">Move-in Date</label>
                  <input className="input" name="move_in_date" type="date" value={form.move_in_date} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Optional" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Optional notes" />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Adding…' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
