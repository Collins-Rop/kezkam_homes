import { createClient } from '@/lib/supabase/server';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SmsPage() {
  const supabase = createClient();

  const { data: logs } = await supabase
    .from('sms_logs')
    .select('*, tenants(full_name)')
    .order('sent_at', { ascending: false })
    .limit(100);

  const sentCount = logs?.filter((l) => l.status === 'sent').length ?? 0;
  const failedCount = logs?.filter((l) => l.status === 'failed').length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">SMS Logs</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {sentCount} sent · {failedCount} failed (last 100)
        </p>
      </div>

      <div className="card">
        {logs && logs.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Status</th>
                <th>Message</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-medium">
                    {(log.tenants as { full_name: string } | null)?.full_name ?? '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{log.phone_number}</td>
                  <td>
                    <span className="badge-gray capitalize">{log.message_type}</span>
                  </td>
                  <td>
                    {log.status === 'sent' ? (
                      <span className="badge-green">
                        <CheckCircle size={11} /> Sent
                      </span>
                    ) : (
                      <span className="badge-red">
                        <XCircle size={11} /> Failed
                      </span>
                    )}
                  </td>
                  <td
                    className="max-w-xs truncate text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                    title={log.message}
                  >
                    {log.message.replace(/\n/g, ' ')}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    {new Date(log.sent_at).toLocaleString('en-KE', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16">
            <MessageSquare size={36} className="mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
              No SMS messages sent yet.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>
              Messages will appear here after recording payments or sending reminders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
