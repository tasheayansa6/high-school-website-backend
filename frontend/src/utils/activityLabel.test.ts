import { describe, expect, it } from 'vitest';

import type { DashboardActivityItem } from '@/types/dashboard.types';
import { formatActivityActor, formatActivityDescription } from '@/utils/activityLabel';

const base: DashboardActivityItem = {
  id: 1,
  action: 'settings.update',
  entityType: 'WebsiteSetting',
  entityId: '23',
  metadata: { key: 'school.tagline', group: 'identity' },
  createdAt: '2026-11-05T11:38:25.091Z',
  admin: null,
};

describe('activityLabel helpers', () => {
  it('formats action, entity, and safe metadata', () => {
    expect(formatActivityDescription(base)).toBe(
      'settings.update · WebsiteSetting · #23 (key: school.tagline; group: identity)',
    );
  });

  it('handles missing entity id and metadata', () => {
    expect(
      formatActivityDescription({
        ...base,
        entityId: null,
        metadata: null,
      }),
    ).toBe('settings.update · WebsiteSetting');
  });

  it('formats actor from admin or fallback', () => {
    expect(formatActivityActor(base)).toBe('System / unknown administrator');
    expect(
      formatActivityActor({
        ...base,
        admin: {
          id: 9,
          firstName: 'Site',
          lastName: 'Admin',
          email: 'admin@abyssinia.local',
        },
      }),
    ).toBe('Site Admin');
  });
});
