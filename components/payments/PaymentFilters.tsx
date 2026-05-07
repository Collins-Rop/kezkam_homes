'use client';

import { useRouter } from 'next/navigation';
import { monthOptions } from '@/lib/utils';

interface Props {
  selectedMonth: string;
  selectedApartment: string;
  apartments: { id: string; name: string }[];
}

export default function PaymentFilters({ selectedMonth, selectedApartment, apartments }: Props) {
  const router = useRouter();
  const months = monthOptions(12);

  function navigate(month: string, apartment: string) {
    const params = new URLSearchParams();
    params.set('month', month);
    if (apartment) params.set('apartment', apartment);
    router.push(`/dashboard/payments?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="label">Month</label>
        <select
          className="input !w-auto"
          value={selectedMonth}
          onChange={(e) => navigate(e.target.value, selectedApartment)}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Apartment</label>
        <select
          className="input !w-auto"
          value={selectedApartment}
          onChange={(e) => navigate(selectedMonth, e.target.value)}
        >
          <option value="">All Apartments</option>
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
