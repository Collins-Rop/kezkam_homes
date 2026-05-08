'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

export default function ResendButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleResend() {
    setState('loading');
    try {
      const res = await fetch('/api/sms/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId }),
      });
      setState(res.ok ? 'done' : 'error');
      if (res.ok) router.refresh();
    } catch {
      setState('error');
    }
  }

  if (state === 'done') return <span className="badge-green text-xs">Sent ✓</span>;
  if (state === 'error') return <span className="badge-red text-xs">Failed</span>;

  return (
    <button
      onClick={handleResend}
      disabled={state === 'loading'}
      className="btn-secondary !px-2 !py-1 !text-xs"
      title="Resend SMS"
    >
      <RotateCcw size={12} className={state === 'loading' ? 'animate-spin' : ''} />
      {state === 'loading' ? 'Sending…' : 'Resend'}
    </button>
  );
}
