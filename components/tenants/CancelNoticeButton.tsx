'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

interface Props {
  noticeId: string;
  tenantName: string;
}

export default function CancelNoticeButton({ noticeId, tenantName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    setLoading(true);
    setError('');

    const res = await fetch(`/api/notices/${noticeId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_reason: reason || undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      setLoading(false);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-danger !px-3 !py-1.5 !text-xs"
      >
        <XCircle size={14} /> Cancel Notice
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="modal-box w-full" style={{ maxWidth: '400px' }}>
            <h2
              className="font-semibold mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Cancel Notice to Vacate
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Are you sure you want to cancel the notice for <strong>{tenantName}</strong>? This means the tenant is staying.
            </p>

            <div className="mb-4">
              <label className="label">Reason (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Tenant changed their mind"
              />
            </div>

            {error && (
              <p
                className="text-sm px-3 py-2 rounded-lg mb-3"
                style={{ background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Keep Notice
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="btn-danger flex-1 justify-center"
              >
                {loading ? 'Cancelling…' : 'Yes, Cancel Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
