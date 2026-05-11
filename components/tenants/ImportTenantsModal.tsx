'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Building {
  id: string;
  name: string;
}

interface ParsedRow {
  full_name: string;
  phone_number: string;
  unit_name: string;
  move_in_date: string;
  deposit_amount?: string;
  error?: string;
}

function splitLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === ',' || ch === '\t') && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  cols.push(current.trim());
  return cols;
}

function detectColumn(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) =>
    keywords.some((kw) => h.toLowerCase().includes(kw))
  );
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const firstCols = splitLine(lines[0]);
  const firstLower = firstCols.map((c) => c.toLowerCase());

  // Check if first row looks like a header
  const hasHeader =
    firstLower.some((c) => c.includes('name') || c.includes('phone') || c.includes('unit'));

  let nameIdx: number, phoneIdx: number, unitIdx: number, dateIdx: number, depositIdx: number;

  if (hasHeader) {
    nameIdx    = detectColumn(firstCols, ['name', 'tenant', 'full']);
    phoneIdx   = detectColumn(firstCols, ['phone', 'mobile', 'tel', 'contact']);
    unitIdx    = detectColumn(firstCols, ['unit', 'room', 'apartment', 'apt', 'house']);
    dateIdx    = detectColumn(firstCols, ['date', 'move', 'start']);
    depositIdx = detectColumn(firstCols, ['deposit', 'security']);
  } else {
    // Fall back to positional: Name, Phone, Unit, Date, Deposit
    [nameIdx, phoneIdx, unitIdx, dateIdx, depositIdx] = [0, 1, 2, 3, 4];
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = splitLine(line);

    const full_name     = nameIdx    >= 0 ? (cols[nameIdx]    ?? '') : '';
    const phone_number  = phoneIdx   >= 0 ? (cols[phoneIdx]   ?? '') : '';
    const unit_name     = unitIdx    >= 0 ? (cols[unitIdx]    ?? '') : '';
    const move_in_raw   = dateIdx    >= 0 ? (cols[dateIdx]    ?? '') : '';
    const deposit_raw   = depositIdx >= 0 ? (cols[depositIdx] ?? '') : '';

    const errors: string[] = [];
    if (!full_name) errors.push('missing name');
    if (!phone_number) errors.push('missing phone');
    if (!unit_name) errors.push('missing unit');

    return {
      full_name,
      phone_number,
      unit_name,
      move_in_date: move_in_raw || new Date().toISOString().split('T')[0],
      deposit_amount: deposit_raw || undefined,
      error: errors.length ? errors.join(', ') : undefined,
    };
  });
}

const TEMPLATE = `Full Name,Phone Number,Unit Name,Move-in Date,Deposit Amount
John Doe,0712345678,Apt A101,2024-01-01,10000
Jane Mwangi,0723456789,Apt B202,2024-03-15,8000
`;

export default function ImportTenantsModal() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'paste' | 'preview' | 'done'>('paste');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  useEffect(() => {
    if (open) {
      supabase
        .from('buildings')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          setBuildings(data ?? []);
          if (data && data.length === 1) {
            setSelectedBuildingId(data[0].id);
          }
        });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleParse() {
    const parsed = parseCSV(csvText);
    setRows(parsed);
    setStep('preview');
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => !r.error);
    if (!validRows.length) return;
    if (!selectedBuildingId) return;

    setLoading(true);
    const res = await fetch('/api/tenants/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenants: validRows, building_id: selectedBuildingId }),
    });
    const data = await res.json();
    setResult({ created: data.created ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] });
    setLoading(false);
    setStep('done');
    router.refresh();
  }

  function closeModal() {
    setOpen(false);
    setCsvText('');
    setRows([]);
    setStep('paste');
    setResult(null);
    setSelectedBuildingId('');
  }

  const validCount = rows.filter((r) => !r.error).length;
  const invalidCount = rows.filter((r) => !!r.error).length;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Upload size={15} /> Import from CSV
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="modal-box w-full"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Upload size={18} style={{ color: 'var(--color-brand)' }} />
                <h2
                  className="font-semibold text-lg"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Import Tenants from CSV
                </h2>
              </div>
              <button onClick={closeModal} className="btn-secondary !p-1.5">
                <X size={16} />
              </button>
            </div>

            {/* ── Step 1: Paste ───────────────────────────────────── */}
            {step === 'paste' && (
              <div className="space-y-4">
                {/* Building selector */}
                <div>
                  <label className="label">Building *</label>
                  <select
                    className="input"
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    required
                  >
                    <option value="">Select building…</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div
                  className="rounded-xl p-4 text-sm space-y-2"
                  style={{
                    background: 'rgba(212,133,26,0.06)',
                    border: '1px solid rgba(212,133,26,0.18)',
                  }}
                >
                  <p className="font-medium" style={{ color: 'var(--color-brand-light)' }}>
                    How to import
                  </p>
                  <ol
                    className="space-y-1 list-decimal list-inside"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <li>Open your Excel file with tenant data.</li>
                    <li>
                      Make sure it has columns for <strong>Name</strong>, <strong>Phone</strong>,
                      and <strong>Unit</strong> — column order does not matter.
                    </li>
                    <li>
                      Save as CSV (File → Save As → CSV), open the file, select all (Ctrl+A),
                      copy and paste below.
                    </li>
                    <li>
                      The <strong>Unit Name</strong> must exactly match a unit in the selected
                      building.
                    </li>
                  </ol>
                </div>

                <button onClick={downloadTemplate} className="btn-secondary w-full justify-center">
                  <Download size={15} /> Download Template (Excel/CSV)
                </button>

                <div>
                  <label className="label">Paste CSV data here</label>
                  <textarea
                    className="input resize-none font-mono text-xs"
                    rows={10}
                    placeholder={`Full Name,Phone Number,Unit Name,Move-in Date,Deposit Amount\nJohn Doe,0712345678,Apt A101,2024-01-01,10000\n…`}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={closeModal} className="btn-secondary flex-1 justify-center">
                    Cancel
                  </button>
                  <button
                    onClick={handleParse}
                    className="btn-primary flex-1 justify-center"
                    disabled={!csvText.trim() || !selectedBuildingId}
                  >
                    Preview Import
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Preview ─────────────────────────────────── */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <span
                    className="text-sm px-3 py-1.5 rounded-full font-medium"
                    style={{
                      background: 'rgba(22,163,74,0.1)',
                      color: '#15803d',
                      border: '1px solid rgba(22,163,74,0.2)',
                    }}
                  >
                    ✓ {validCount} ready to import
                  </span>
                  {invalidCount > 0 && (
                    <span
                      className="text-sm px-3 py-1.5 rounded-full font-medium"
                      style={{
                        background: 'rgba(220,38,38,0.08)',
                        color: '#b91c1c',
                        border: '1px solid rgba(220,38,38,0.18)',
                      }}
                    >
                      ✗ {invalidCount} with errors (will be skipped)
                    </span>
                  )}
                </div>

                {/* Preview table */}
                <div
                  className="overflow-auto rounded-xl"
                  style={{
                    border: '1px solid var(--color-border)',
                    maxHeight: '320px',
                  }}
                >
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Unit</th>
                        <th>Move-in</th>
                        <th>Deposit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={i}
                          style={
                            r.error
                              ? { background: 'rgba(220,38,38,0.04)' }
                              : { background: 'rgba(22,163,74,0.03)' }
                          }
                        >
                          <td className="font-medium">{r.full_name || '—'}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{r.phone_number || '—'}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{r.unit_name || '—'}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{r.move_in_date}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{r.deposit_amount || '—'}</td>
                          <td>
                            {r.error ? (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle size={11} /> {r.error}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 size={11} /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {validCount === 0 && (
                  <p
                    className="text-sm text-center py-3 rounded-lg"
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      color: '#b91c1c',
                      border: '1px solid rgba(220,38,38,0.15)',
                    }}
                  >
                    No valid rows to import. Please fix the errors above.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('paste')}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading || validCount === 0}
                    className="btn-primary flex-1 justify-center"
                  >
                    {loading ? 'Importing…' : `Import ${validCount} Tenant${validCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Done ────────────────────────────────────── */}
            {step === 'done' && result && (
              <div className="text-center py-8 space-y-4">
                <div className="text-5xl">{result.created > 0 ? '✓' : '!'}</div>
                <div>
                  <p
                    className="font-semibold text-lg"
                    style={{
                      color: result.created > 0 ? '#15803d' : 'var(--color-text)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {result.created} tenant{result.created !== 1 ? 's' : ''} imported successfully
                  </p>
                  {result.skipped > 0 && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {result.skipped} duplicate tenant{result.skipped !== 1 ? 's' : ''} skipped.
                    </p>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-500">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={closeModal} className="btn-primary">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
