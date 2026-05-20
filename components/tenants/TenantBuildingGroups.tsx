'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface TenantListItem {
  id: string;
  full_name: string;
  phone_number: string;
  move_in_date: string;
  apartment_id: string | null;
  apartment_name: string | null;
  building_id: string | null;
}

export interface TenantFloorGroup {
  floor: string;
  label: string;
  tenants: TenantListItem[];
}

export interface TenantBuildingGroup {
  id: string;
  name: string;
  tenantCount: number;
  floors: TenantFloorGroup[];
}

interface Props {
  buildings: TenantBuildingGroup[];
}

export default function TenantBuildingGroups({ buildings }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleBuilding(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {buildings.map((building) => {
        const isCollapsed = collapsed.has(building.id);

        return (
          <div
            key={building.id}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <button
              type="button"
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
              style={{
                background: 'rgba(212,133,26,0.06)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
              }}
              onClick={() => toggleBuilding(building.id)}
            >
              {isCollapsed
                ? <ChevronRight size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
                : <ChevronDown size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
              }
              <span
                className="font-semibold flex-1 min-w-0 truncate"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)' }}
              >
                {building.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {building.tenantCount} tenant{building.tenantCount !== 1 ? 's' : ''}
              </span>
            </button>

            {!isCollapsed && (
              <div className="space-y-5 p-5">
                {building.floors.map((floor) => (
                  <div key={`${building.id}-${floor.floor}`}>
                    <h3
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {floor.label} · {floor.tenants.length} tenant{floor.tenants.length !== 1 ? 's' : ''}
                    </h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Unit</th>
                          <th>Since</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {floor.tenants.map((tenant) => (
                          <tr key={tenant.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                  style={{ background: 'rgba(212,133,26,0.15)', color: 'var(--color-brand)' }}
                                >
                                  {tenant.full_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{tenant.full_name}</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--color-text-muted)' }}>{tenant.phone_number}</td>
                            <td>
                              {tenant.apartment_id ? (
                                <Link
                                  href={`/dashboard/apartments/${tenant.building_id ?? ''}/${tenant.apartment_id}`}
                                  className="text-sm hover:underline"
                                  style={{ color: 'var(--color-brand-light)' }}
                                >
                                  {tenant.apartment_name ?? '—'}
                                </Link>
                              ) : (
                                <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                              )}
                            </td>
                            <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(tenant.move_in_date)}</td>
                            <td>
                              <Link
                                href={`/dashboard/tenants/${tenant.id}`}
                                className="text-xs"
                                style={{ color: 'var(--color-brand)' }}
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
