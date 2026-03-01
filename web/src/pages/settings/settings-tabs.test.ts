import { describe, expect, it } from 'vitest';
import { findAdminSubTabGroup } from './settings-tabs';

describe('settings temp tab grouping', () => {
  it('maps integration-catalog-temp to a standalone group with only itself', () => {
    const group = findAdminSubTabGroup('integration-catalog-temp');
    expect(group?.tabs.map((tab) => tab.id)).toEqual(['integration-catalog-temp']);
  });
});

