import { describe, expect, it } from 'vitest';
import { findNavItemByPath } from './settings-nav';

describe('settings nav', () => {
  it('resolves admin instance-config path to admin nav item', () => {
    const item = findNavItemByPath('/app/settings/admin/instance-config');
    expect(item).not.toBeNull();
    expect(item?.id).toBe('admin-services');
  });

  it('resolves admin sub-paths via aliases', () => {
    for (const sub of ['audit', 'worker-config', 'platform-config']) {
      const item = findNavItemByPath(`/app/settings/admin/${sub}`);
      expect(item?.id).toBe('admin-services');
    }
  });
});
