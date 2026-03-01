import { describe, expect, it } from 'vitest';
import { findNavItemByPath } from './settings-nav';

describe('settings nav aliases', () => {
  it('resolves integration catalog temp paths to the temp nav item', () => {
    const item = findNavItemByPath('/app/settings/admin/integration-catalog-temp');
    expect(item?.id).toBe('admin-integrations-temp');
  });
});
