import { describe, expect, it } from 'vitest';
import { findNavItemByPath } from './settings-nav';

describe('settings nav', () => {
  it('does not treat superuser pages as settings nav items', () => {
    expect(findNavItemByPath('/app/settings/admin/instance-config')).toBeNull();
    expect(findNavItemByPath('/app/superuser/instance-config')).toBeNull();
    expect(findNavItemByPath('/app/superuser/audit')).toBeNull();
  });
});
