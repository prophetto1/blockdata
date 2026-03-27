import { describe, expect, it } from 'vitest';

import {
  TOP_LEVEL_NAV,
  ALL_TOP_LEVEL_ITEMS,
  BOTTOM_RAIL_NAV,
  getDrillConfig,
  findDrillByRoute,
  resolveFlowDrillPath,
} from './nav-config';

describe('nav-config side rail', () => {
  it('keeps the primary global pages in the top-level nav', () => {
    const paths = ALL_TOP_LEVEL_ITEMS.map((item) => item.path);

    expect(paths).toContain('/app/assets');
    expect(paths).toContain('/app/knowledge-bases');
    expect(paths).toContain('/app/onboarding/agents');
    expect(paths).toContain('/app/parse');
    expect(paths).toContain('/app/extract');
    expect(paths).toContain('/app/rag');
    expect(paths).toContain('/app/flows');
    expect(paths).toContain('/app/database');
    expect(paths).toContain('/app/settings/secrets');
    expect(paths).toContain('/app/logs');
    expect(paths).toContain('/app/settings');
    expect(paths).not.toContain('/app/elt');
    expect(paths).not.toContain('/app/executions');
    expect(paths).not.toContain('/app/namespaces');
    expect(paths).not.toContain('/app/plugins');
    expect(paths).not.toContain('/app/blueprints');
    expect(paths).not.toContain('/app/tenant');
  });

  it('bottom utility rail is defined (currently empty)', () => {
    expect(BOTTOM_RAIL_NAV).toBeDefined();
    expect(Array.isArray(BOTTOM_RAIL_NAV)).toBe(true);
  });

  it('includes extract plus editor and catalog items', () => {
    const paths = ALL_TOP_LEVEL_ITEMS.map((item) => item.path);

    expect(paths).toContain('/app/extract');
    expect(paths).toContain('/app/transform');
    expect(paths).toContain('/app/knowledge-bases');
    expect(paths).toContain('/app/onboarding/agents');
    expect(paths).toContain('/app/schemas');
    expect(paths).toContain('/app/api-editor');
    expect(paths).toContain('/app/marketplace/integrations');
    expect(paths).toContain('/app/marketplace/services');
    expect(paths).toContain('/app/settings/secrets');
    expect(paths).toContain('/app/tests');
    expect(paths).not.toContain('/app/docs');
  });


  it('places Workspace in its own rail section, above Integrations', () => {
    const schemaIndex = TOP_LEVEL_NAV.findIndex(
      (entry) => entry !== 'divider' && entry.path === '/app/schemas',
    );
    const workspaceIndex = TOP_LEVEL_NAV.findIndex(
      (entry) => entry !== 'divider' && entry.path === '/app/workspace',
    );
    const integrationsIndex = TOP_LEVEL_NAV.findIndex(
      (entry) => entry !== 'divider' && entry.path === '/app/marketplace/integrations',
    );

    expect(schemaIndex).toBeGreaterThanOrEqual(0);
    expect(workspaceIndex).toBe(schemaIndex + 2); // divider between schema and workspace
    expect(TOP_LEVEL_NAV[workspaceIndex - 1]).toBe('divider');
    expect(TOP_LEVEL_NAV[workspaceIndex + 1]).toBe('divider');
    expect(integrationsIndex).toBe(workspaceIndex + 2); // divider then integrations
  });
  it('places Extract, Transform, Convert, RAG in sequence in the top-level nav', () => {
    const labels = ALL_TOP_LEVEL_ITEMS.map((item) => item.label);
    const extractIdx = labels.indexOf('Extract');

    expect(extractIdx).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Transform')).toBe(extractIdx + 1);
    expect(labels.indexOf('Convert')).toBe(extractIdx + 2);
    expect(labels.indexOf('RAG')).toBe(extractIdx + 3);
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

  it('keeps Assets label aligned across classic and pipeline nav', () => {
    const classicAssets = TOP_LEVEL_NAV.find((entry) => entry !== 'divider' && entry.path === '/app/assets');
    const activeAssets = ALL_TOP_LEVEL_ITEMS.filter((item) => item.path === '/app/assets').map((item) => item.label);

    expect(classicAssets && classicAssets !== 'divider' ? classicAssets.label : null).toBe('Assets');
    expect(activeAssets).toContain('Assets');
    expect(activeAssets).not.toContain('Aggregate Sources');
  });

  it('exposes Agent Onboarding in classic view', () => {
    const classicOnboarding = TOP_LEVEL_NAV.find(
      (entry) => entry !== 'divider' && entry.path === '/app/onboarding/agents',
    );

    expect(classicOnboarding && classicOnboarding !== 'divider' ? classicOnboarding.label : null).toBe('Agent Onboarding');
  });

  it('uses Ingest as the classic top-level label for /app/parse', () => {
    const classicParse = TOP_LEVEL_NAV.find(
      (entry) => entry !== 'divider' && entry.path === '/app/parse',
    );

    expect(classicParse && classicParse !== 'divider' ? classicParse.label : null).toBe('Ingest');
  });

  it('uses Workbench as the classic top-level label for /app/workspace', () => {
    const classicWorkspace = TOP_LEVEL_NAV.find(
      (entry) => entry !== 'divider' && entry.path === '/app/workspace',
    );

    expect(classicWorkspace && classicWorkspace !== 'divider' ? classicWorkspace.label : null).toBe('Workbench');
  });
});

describe('drill configs', () => {
  it('has configs for flows and settings', () => {
    expect(getDrillConfig('flows')).toBeDefined();
    expect(getDrillConfig('settings')).toBeDefined();
    expect(getDrillConfig('observability')).toBeDefined();
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

  it('settings drill includes the canonical secrets route', () => {
    const settings = getDrillConfig('settings')!;
    const sectionLabels = settings.sections.map((s) => s.label);
    const allPaths = settings.sections.flatMap((section) => section.items.map((item) => item.path));

    expect(sectionLabels).toEqual(['General']);
    expect(allPaths).toEqual([
      '/app/settings/profile',
      '/app/settings/themes',
      '/app/settings/secrets',
    ]);
  });

  it('exposes secrets in classic view', () => {
    const classicSecrets = TOP_LEVEL_NAV.find(
      (entry) => entry !== 'divider' && entry.path === '/app/settings/secrets',
    );

    expect(classicSecrets && classicSecrets !== 'divider' ? classicSecrets.label : null).toBe('Secrets');
  });

  it('observability drill exposes logs', () => {
    const observability = getDrillConfig('observability')!;
    const labels = observability.sections.flatMap((section) => section.items.map((item) => item.label));
    const paths = observability.sections.flatMap((section) => section.items.map((item) => item.path));

    expect(labels).toContain('Logs');
    expect(paths).toContain('/app/logs');
  });

  it('build ai drill omits integration options', () => {
    const buildAi = getDrillConfig('build-ai')!;
    const labels = buildAi.sections.flatMap((section) => section.items.map((item) => item.label));
    const paths = buildAi.sections.flatMap((section) => section.items.map((item) => item.path));

    expect(labels).toContain('Agent Onboarding');
    expect(paths).toContain('/app/onboarding/agents');
    expect(labels).not.toContain('Integration Options');
    expect(paths).not.toContain('/app/agents');
  });

  it('workbench drill exposes transform', () => {
    const workbench = getDrillConfig('workbench')!;
    const labels = workbench.sections.flatMap((section) => section.items.map((item) => item.label));
    const paths = workbench.sections.flatMap((section) => section.items.map((item) => item.path));

    expect(labels).toContain('Transform');
    expect(paths).toContain('/app/transform');
    expect(labels).toContain('Secrets');
    expect(paths).toContain('/app/settings/secrets');
  });

  it('settings drill does not include admin/superuser links', () => {
    const settings = getDrillConfig('settings')!;
    const allPaths = settings.sections.flatMap((s) => s.items.map((item) => item.path));

    expect(allPaths.some((path) => path.startsWith('/app/superuser'))).toBe(false);
  });

  it('findDrillByRoute matches correctly', () => {
    expect(findDrillByRoute('/app/flows/abc/edit')?.id).toBe('flows');
    expect(findDrillByRoute('/app/flows')).toBeNull();
    expect(findDrillByRoute('/app/settings/profile')?.id).toBe('settings');
    expect(findDrillByRoute('/app/settings')?.id).toBe('settings');
    expect(findDrillByRoute('/app/onboarding/agents/select')?.id).toBe('build-ai');
    expect(findDrillByRoute('/app/onboarding/agents')?.id).toBe('build-ai');
    expect(findDrillByRoute('/app/agents')?.id).toBe('build-ai');
    expect(findDrillByRoute('/app/skills')?.id).toBe('build-ai');
    expect(findDrillByRoute('/app/secrets')).toBeNull();
    expect(findDrillByRoute('/app/settings/secrets')?.id).toBe('settings');
    expect(findDrillByRoute('/app/logs')?.id).toBe('observability');
    expect(findDrillByRoute('/app/transform')?.id).toBe('workbench');
    expect(findDrillByRoute('/app/elt')).toBeNull();
    expect(findDrillByRoute('/app/database')?.id).toBe('ingest');
  });

  it('resolveFlowDrillPath builds correct paths', () => {
    expect(resolveFlowDrillPath('edit', 'flow-123')).toBe('/app/flows/flow-123/edit');
    expect(resolveFlowDrillPath('overview', 'abc')).toBe('/app/flows/abc/overview');
  });
});





