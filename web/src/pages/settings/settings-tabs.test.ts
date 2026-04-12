import { describe, expect, it } from 'vitest';
import { findAdminSubTabGroup } from './settings-tabs';

describe('settings tab grouping', () => {
  it('maps audit to the operations group', () => {
    const group = findAdminSubTabGroup('audit');
    expect(group?.id).toBe('operations');
  });
});
