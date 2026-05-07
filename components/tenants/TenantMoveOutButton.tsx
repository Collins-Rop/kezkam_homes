'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, X } from 'lucide-react';

interface Props {
  tenantId: string;
  tenantName: string;
}

export default function TenantMoveOutButton({ tenantId, tenantName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleMoveOut() {
    setLoading(true);

    const { error } = await supabase
      .from('tenants')
      .update({
        is_active: false,
        move_out_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', tenantId);

    if (error) {
      alert(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    // Optionally send move-out SMS via API
    await fetch('/api/sms/move-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    }).catch(() => {});

    setShowConfirm(false);
    router.refresh();
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400">Move out {tenantName.split(' ')[0]}?</span>
        <button
          onClick={handleMoveOut}
          disabled={loading}
          className="btn-danger !px-2 !py-1 !text-xs"
        >
          {loading ? '…' : 'Yes'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="btn-secondary !p-1"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="btn-secondary !px-2 !py-1.5 !text-xs"
      title="Record move-out"
    >
      <LogOut size={13} /> Move Out
    </button>
  );
}
