import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, startOfMonth } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy');
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy');
}

export function currentMonthISO(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

export function monthOptions(count = 12): { label: string; value: string }[] {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: format(d, 'MMMM yyyy'),
      value: format(d, 'yyyy-MM-dd'),
    });
  }
  return options;
}

export function normalizePhone(raw: string): string {
  const digits = raw.trim().replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('7') && digits.length === 9) return `+254${digits}`;
  if (digits.startsWith('7') && digits.length === 8) return `+2547${digits}`; // best-effort for 8-digit
  return raw.trim();
}

/** Returns true if a +254XXXXXXXXX number belongs to Safaricom (M-Pesa). */
export function isSafaricom(normalized: string): boolean {
  if (!normalized.startsWith('+254') || normalized.length !== 13) return false;
  const prefix = parseInt(normalized.slice(4, 7), 10); // 3-digit prefix e.g. 722
  return (
    (prefix >= 700 && prefix <= 729) || // 0700–0729
    (prefix >= 740 && prefix <= 748) || // 0740–0748
    (prefix >= 757 && prefix <= 759) || // 0757–0759
    (prefix >= 768 && prefix <= 769) || // 0768–0769
    (prefix >= 790 && prefix <= 799) || // 0790–0799
    (prefix >= 110 && prefix <= 115)    // 0110–0115 (newer Safaricom)
  );
}

/**
 * When a tenant has multiple numbers (space/comma/slash separated),
 * pick the Safaricom number first (for M-Pesa). Falls back to the first valid number.
 */
export function selectPhone(raw: string): string {
  const parts = raw.trim().split(/[\s,\/;]+/).filter(Boolean);
  if (parts.length <= 1) return normalizePhone(raw);

  const normalized = parts.map(normalizePhone);
  return normalized.find(isSafaricom) ?? normalized[0] ?? normalizePhone(raw);
}
