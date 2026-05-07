'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  tenant: { id: string; full_name: string; apartment_id: string | null };
  unitName: string;
  depositAlreadyPaid?: number;
}

export default function GiveNoticeModal({ tenant, unitName, depositAlreadyPaid }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    notice_date: today,
    vacate_date: '',
    deposit_amount: depositAlreadyPaid ?? 0,
    arrears_deducted: 0,
    notes: '',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === 'deposit_amount' || name === 'arrears_deducted'
        ? parseFloat(value) || 0
        : value,
    }));
  }

  const refund = form.deposit_amount - form.arrears_deducted;

  function closeModal() {
    setOpen(false);
    setError('');
    setSuccess('');
    setForm({
      notice_date: today,
      vacate_date: '',
      deposit_amount: depositAlreadyPaid ?? 0,
      arrears_deducted: 0,
      notes: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vacate_date) {
      setError('Vacate date is required.');
      return;
    }
    if (!tenant.apartment_id) {
      setError('Tenant has no apartment assigned.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        apartment_id: tenant.apartment_id,
        notice_date: form.notice_date,
        vacate_date: form.vacate_date,
        deposit_amount: form.deposit_amount,
        arrears_deducted: form.arrears_deducted,
        notes: form.notes || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      setLoading(false);
      return;
    }

    setSuccess(
      `Notice recorded. Refund due: ${formatCurrency(refund)}. SMS sent to ${tenant.full_name}.`
    );
    setLoading(false);
    router.refresh();
    setTimeout(closeModal, 2500);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary !px-3 !py-1.5 !text-xs">
        <FileText size={14} /> Give Notice
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-box w-full" style={{ maxWidth: '480px' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText size={18} style={{ color: 'var(--color-brand)' }} />
                <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                  Notice to Vacate
                </h2>
              </div>
              <button onClick={closeModal} className="btn-secondary !p-1.5">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Recording notice for <strong>{tenant.full_name}</strong> — {unitName}
            </p>

            {success ? (
              <div
                className="text-center py-8 space-y-3 rounded-xl"
                style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}
              >
                <p className="font-semibold text-lg" style={{ color: '#15803d' }}>
                  Notice Recorded
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Notice Date</label>
                    <input
                      className="input"
                      type="date"
                      name="notice_date"
                      value={form.notice_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Vacate Date *</label>
                    <input
                      className="input"
                      type="date"
                      name="vacate_date"
                      value={form.vacate_date}
                      onChange={handleChange}
                      min={today}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Deposit Paid (KES)</label>
                    <input
                      className="input"
                      type="number"
                      name="deposit_amount"
                      min="0"
                      value={form.deposit_amount}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Arrears to Deduct (KES)</label>
                    <input
                      className="input"
                      type="number"
                      name="arrears_deducted"
                      min="0"
                      value={form.arrears_deducted}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Refund calculation */}
                <div
                  className="flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{
                    background: refund >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.06)',
                    border: `1px solid ${refund >= 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)'}`,
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)' }}>Refund Due</span>
                  <span style={{ color: refund >= 0 ? '#15803d' : '#b91c1c', fontSize: '1rem' }}>
                    {formatCurrency(refund)}
                  </span>
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input resize-none"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>

                {error && (
                  <p
                    className="text-sm px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.15)' }}
                  >
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                    {loading ? 'Recording…' : 'Record & Send SMS'}
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
