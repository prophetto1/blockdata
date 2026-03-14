import { describe, expect, it } from 'vitest';
import { findAdminSubTabGroup } from './settings-tabs';

describe('settings tab grouping', () => {
  it('maps config panels to the operations group', () => {
    for (const id of ['instance-config', 'worker-config'] as const) {
      const group = findAdminSubTabGroup(id);
      expect(group?.id).toBe('operations');
    }
  });

  it('maps audit to the operations group', () => {
    const group = findAdminSubTabGroup('audit');
    expect(group?.id).toBe('operations');
  });
});
