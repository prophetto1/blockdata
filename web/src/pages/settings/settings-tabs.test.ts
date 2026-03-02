import { describe, expect, it } from 'vitest';
import { findAdminSubTabGroup } from './settings-tabs';

describe('settings tab grouping', () => {
  it('maps integration-catalog to the operations group', () => {
    const group = findAdminSubTabGroup('integration-catalog');
    expect(group?.id).toBe('operations');
    expect(group?.tabs.map((tab) => tab.id)).toContain('integration-catalog');
  });
});