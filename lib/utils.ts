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
  // If multiple numbers are stored (space/comma/slash separated), take the first part
  const first = raw.trim().split(/[\s,\/;]+/)[0] ?? raw;
  const digits = first.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('7') && digits.length === 9) return `+254${digits}`;
  if (digits.startsWith('7') && digits.length === 8) return `+2547${digits}`; // missing leading digit e.g. 72907195 → +25472907195... unlikely but best effort

  return first; // return the first segment even if we can't normalize
}
