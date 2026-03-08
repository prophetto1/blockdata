import { describe, expect, it } from 'vitest';

import {
  TOP_LEVEL_NAV,
  ALL_TOP_LEVEL_ITEMS,
  getDrillConfig,
  findDrillByRoute,
  resolveFlowDrillPath,
} from './nav-config';

describe('nav-config side rail', () => {
  it('keeps the primary global pages in the top-level nav', () => {
    const paths = ALL_TOP_LEVEL_ITEMS.map((item) => item.path);

    expect(paths).toContain('/app/flows');
    expect(paths).toContain('/app/elt');
    expect(paths).toContain('/app/database');
    expect(paths).toContain('/app/settings');
    expect(paths).not.toContain('/app/executions');
    expect(paths).not.toContain('/app/logs');
    expect(paths).not.toContain('/app/assets');
    expect(paths).not.toContain('/app/namespaces');
    expect(paths).not.toContain('/app/plugins');
    expect(paths).not.toContain('/app/blueprints');
    expect(paths).not.toContain('/app/tenant');
  });

  it('includes editor and catalog items', () => {
    const paths = ALL_TOP_LEVEL_ITEMS.map((item) => item.path);

    expect(paths).toContain('/app/schemas');
    expect(paths).toContain('/app/api-editor');
    expect(paths).toContain('/app/marketplace/integrations');
    expect(paths).toContain('/app/marketplace/services');
    expect(paths).toContain('/app/tests');
  });

  it('has dividers in TOP_LEVEL_NAV', () => {
    const dividers = TOP_LEVEL_NAV.filter((entry) => entry === 'divider');
    expect(dividers.length).toBeGreaterThanOrEqual(3);
  });

  it('marks drill items with drillId', () => {
    const drillItems = ALL_TOP_LEVEL_ITEMS.filter((item) => item.drillId);
    const drillIds = drillItems.map((item) => item.drillId);

    expect(drillIds).toContain('flows');
    expect(drillIds).toContain('settings');
  });
});

describe('drill configs', () => {
  it('has configs for flows and settings', () => {
    expect(getDrillConfig('flows')).toBeDefined();
    expect(getDrillConfig('settings')).toBeDefined();
    expect(getDrillConfig('nonexistent')).toBeUndefined();
  });

  it('flows drill has expected tabs', () => {
    const flows = getDrillConfig('flows')!;
    const allItems = flows.sections.flatMap((s) => s.items);
    const labels = allItems.map((item) => item.label);

    expect(labels).toContain('Overview');
    expect(labels).toContain('Executions');
    expect(labels).toContain('Edit');
    expect(labels).toContain('Audit Logs');
  });

  it('settings drill has expected sections', () => {
    const settings = getDrillConfig('settings')!;
    const sectionLabels = settings.sections.map((s) => s.label);

    expect(sectionLabels).toContain('General');
    expect(sectionLabels).toContain('Operations');
  });

  it('findDrillByRoute matches correctly', () => {
    expect(findDrillByRoute('/app/flows/abc/edit')?.id).toBe('flows');
    expect(findDrillByRoute('/app/flows')).toBeNull(); // list page — no drill
    expect(findDrillByRoute('/app/settings/profile')?.id).toBe('settings');
    expect(findDrillByRoute('/app/settings')?.id).toBe('settings');
    expect(findDrillByRoute('/app/elt')).toBeNull();
    expect(findDrillByRoute('/app/database')).toBeNull();
  });

  it('resolveFlowDrillPath builds correct paths', () => {
    expect(resolveFlowDrillPath('edit', 'flow-123')).toBe('/app/flows/flow-123/edit');
    expect(resolveFlowDrillPath('overview', 'abc')).toBe('/app/flows/abc/overview');
  });
});
