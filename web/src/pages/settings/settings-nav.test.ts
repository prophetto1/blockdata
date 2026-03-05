import { describe, expect, it } from 'vitest';
import { findNavItemByPath } from './settings-nav';

describe('settings nav', () => {
  it('does not expose the removed admin services path', () => {
    const item = findNavItemByPath('/app/settings/admin/services');
    expect(item).toBeNull();
  });
});
