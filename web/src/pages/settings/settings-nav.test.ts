import { describe, expect, it } from 'vitest';
import { ALL_NAV_ITEMS, findNavItemByPath } from './settings-nav';

describe('settings nav', () => {
  it('includes secrets in settings navigation', () => {
    const secrets = ALL_NAV_ITEMS.find((item) => item.path === '/app/settings/secrets');

    expect(secrets?.label).toBe('Secrets');
  });

  it('resolves the canonical secrets settings route', () => {
    expect(findNavItemByPath('/app/settings/secrets')?.label).toBe('Secrets');
  });

  it('uses the canonical BD AI providers route under superuser', () => {
    const aiProviders = ALL_NAV_ITEMS.find((item) => item.id === 'ai-providers');

    expect(aiProviders?.path).toBe('/app/superuser/bd/ai-providers');
  });

  it('does not treat superuser pages as settings nav items', () => {
    expect(findNavItemByPath('/app/settings/admin/instance-config')).toBeNull();
    expect(findNavItemByPath('/app/superuser/instance-config')).toBeNull();
    expect(findNavItemByPath('/app/superuser/audit')).toBeNull();
  });
});
