import type { DashboardActivityItem } from '@/types/dashboard.types';

/** Human-readable activity line from backend audit fields only. */
export function formatActivityDescription(item: DashboardActivityItem): string {
  const parts = [item.action, item.entityType];
  if (item.entityId) {
    parts.push(`#${item.entityId}`);
  }

  const metadataBits: string[] = [];
  if (item.metadata) {
    for (const [key, value] of Object.entries(item.metadata)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        metadataBits.push(`${key}: ${String(value)}`);
      } else if (Array.isArray(value) && value.length > 0) {
        metadataBits.push(`${key}: ${value.join(', ')}`);
      }
    }
  }

  const base = parts.join(' · ');
  return metadataBits.length > 0 ? `${base} (${metadataBits.join('; ')})` : base;
}

export function formatActivityActor(item: DashboardActivityItem): string {
  if (!item.admin) {
    return 'System / unknown administrator';
  }
  return `${item.admin.firstName} ${item.admin.lastName}`.trim() || item.admin.email;
}
