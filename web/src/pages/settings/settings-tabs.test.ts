import { describe, expect, it } from 'vitest';
import { findAdminSubTabGroup } from './settings-tabs';

describe('settings tab grouping', () => {
  it('maps services to the operations group', () => {
    const group = findAdminSubTabGroup('services');
    expect(group?.id).toBe('operations');
    expect(group?.tabs.map((tab) => tab.id)).toContain('services');
  });
});
