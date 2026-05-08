'use client';

import { useRouter } from 'next/navigation';

interface Building {
  id: string;
  name: string;
}

export default function BuildingSelector({
  buildings,
  selectedId,
}: {
  buildings: Building[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      className="input !py-1.5 !text-sm"
      style={{ maxWidth: '220px' }}
      value={selectedId}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val === 'all' ? '/dashboard' : `/dashboard?building=${val}`);
      }}
    >
      <option value="all">All Buildings</option>
      {buildings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
