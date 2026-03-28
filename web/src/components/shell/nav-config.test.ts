import { describe, expect, it } from 'vitest';

import {
  TOP_LEVEL_NAV,
  PIPELINE_NAV,
  ALL_TOP_LEVEL_ITEMS,
  BOTTOM_RAIL_NAV,
  isNavItem,
  isClassicNavSection,
  getDrillConfig,
  findDrillByRoute,
  resolveFlowDrillPath,
} from './nav-config';

describe('nav-config side rail', () => {
  it('keeps the primary global pages in the top-level nav', () => {
    const paths = ALL_TOP_LEVEL_ITEMS.map((item) => item.path);

    expect(paths).toContain('/app/assets');
    expect(paths).toContain('/app/pipeline-services');
    expect(paths).toContain('/app/pipeline-services/knowledge-bases');
    expect(paths).toContain('/app/onboarding/agents');
    expect(paths).toContain('/app/parse');
    expect(paths).toContain('/app/extract');
    expect(paths).not.toContain('/app/rag');
    expect(paths).not.toContain('/app/knowledge-bases');
    expect(paths).toContain('/app/flows');
    expect(paths).toContain('/app/database');
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
    expect(paths).toContain('/app/pipeline-services/knowledge-bases');
    expect(paths).toContain('/app/onboarding/agents');
    expect(paths).toContain('/app/schemas');
    expect(paths).toContain('/app/api-editor');
    expect(paths).toContain('/app/marketplace/integrations');
    expect(paths).toContain('/app/marketplace/services');
    expect(paths).toContain('/app/tests');
    expect(paths).not.toContain('/app/docs');
  });

  it('does not expose RAG as a user-facing nav label', () => {
    const labels = ALL_TOP_LEVEL_ITEMS.map((item) => item.label);

    expect(labels).not.toContain('RAG');
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

  it('uses the flows drill in classic view and keeps secrets out of classic top-level nav', () => {
    const classicFlows = TOP_LEVEL_NAV.find(
      (entry) => isNavItem(entry) && entry.path === '/app/flows',
    );
    const classicSecrets = TOP_LEVEL_NAV.find(
      (entry) => isNavItem(entry) && entry.path === '/app/settings/secrets',
    );

    expect(classicFlows && classicFlows !== 'divider' ? classicFlows.drillId : null).toBe('flows');
    expect(classicSecrets).toBeUndefined();
  });

  it('keeps Assets label aligned across classic and pipeline nav', () => {
    const classicAssets = TOP_LEVEL_NAV.find((entry) => isNavItem(entry) && entry.path === '/app/assets');
    const activeAssets = ALL_TOP_LEVEL_ITEMS.filter((item) => item.path === '/app/assets').map((item) => item.label);

    expect(classicAssets && classicAssets !== 'divider' ? classicAssets.label : null).toBe('Assets');
    expect(activeAssets).toContain('Assets');
    expect(activeAssets).not.toContain('Aggregate Sources');
  });

  it('exposes Agent Onboarding in classic view', () => {
    const classicBuildAi = TOP_LEVEL_NAV.find(
      (entry) => isClassicNavSection(entry) && entry.label === 'Build AI / Agents',
    );

    expect(classicBuildAi && classicBuildAi !== 'divider' ? classicBuildAi.items.some((item) => item.path === '/app/onboarding/agents') : false).toBe(true);
  });

  it('uses Ingest as the classic top-level label for /app/parse', () => {
    const classicParse = TOP_LEVEL_NAV.find(
      (entry) => isClassicNavSection(entry) && entry.label === 'Ingest',
    );

    expect(classicParse && classicParse !== 'divider' ? classicParse.items.some((item) => item.path === '/app/parse') : false).toBe(true);
  });

  it('uses Workbench as the classic top-level label for /app/workspace', () => {
    const classicWorkspace = TOP_LEVEL_NAV.find(
      (entry) => isNavItem(entry) && entry.path === '/app/workspace',
    );

    expect(classicWorkspace && classicWorkspace !== 'divider' ? classicWorkspace.label : null).toBe('Workbench');
  });

  it('renders pipeline services as a classic section heading instead of a RAG leaf', () => {
    const pipelineServicesSection = TOP_LEVEL_NAV.find(
      (entry) => isClassicNavSection(entry) && entry.label === 'Pipeline Services',
    );
    const classicRag = TOP_LEVEL_NAV.find(
      (entry) => isNavItem(entry) && entry.label === 'RAG',
    );

    expect(pipelineServicesSection && pipelineServicesSection !== 'divider'
      ? pipelineServicesSection.items.map((item) => item.path)
      : []).toEqual([
      '/app/pipeline-services/knowledge-bases',
      '/app/pipeline-services/index-builder',
    ]);
    expect(classicRag).toBeUndefined();
  });

  it('uses Flows as the pipeline label and nests knowledge bases under Pipeline Services', () => {
    const pipelineFlows = PIPELINE_NAV.find(
      (entry) => entry !== 'divider' && entry.path === '/app/flows',
    );
    const pipelineServices = PIPELINE_NAV.find(
      (entry) => entry !== 'divider' && entry.drillId === 'pipeline-services',
    );
    const pipelineKnowledgeBases = PIPELINE_NAV.find(
      (entry) => entry !== 'divider' && entry.label === 'Knowledge Bases',
    );

    expect(pipelineFlows && pipelineFlows !== 'divider' ? pipelineFlows.label : null).toBe('Flows');
    expect(pipelineServices && pipelineServices !== 'divider' ? pipelineServices.path : null).toBe('/app/pipeline-services');
    expect(pipelineKnowledgeBases).toBeUndefined();
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

    expect(sectionLabels).toEqual([undefined]);
    expect(allPaths).toEqual([
      '/app/settings/profile',
      '/app/settings/themes',
      '/app/settings/secrets',
    ]);
  });

  it('observability drill exposes logs', () => {
    const observability = getDrillConfig('observability')!;
    const labels = observability.sections.flatMap((section) => section.items.map((item) => item.label));
    const paths = observability.sections.flatMap((section) => section.items.map((item) => item.path));

    expect(labels).toContain('Logs');
    expect(paths).toContain('/app/logs');
  });

  it('pipeline services drill exposes Index Builder as a dedicated service route', () => {
    const pipelineServices = getDrillConfig('pipeline-services')!;
    const labels = pipelineServices.sections.flatMap((section) => section.items.map((item) => item.label));
    const paths = pipelineServices.sections.flatMap((section) => section.items.map((item) => item.path));

    expect(labels).toContain('Knowledge Bases');
    expect(paths).toContain('/app/pipeline-services/knowledge-bases');
    expect(labels).toContain('Index Builder');
    expect(paths).toContain('/app/pipeline-services/index-builder');
    expect(labels).not.toContain('RAG');
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
    expect(findDrillByRoute('/app/pipeline-services')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/pipeline-services/knowledge-bases')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/pipeline-services/index-builder')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/knowledge-bases')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/rag')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/rag/index-builder')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/elt')).toBeNull();
    expect(findDrillByRoute('/app/database')?.id).toBe('ingest');
  });

  it('resolveFlowDrillPath builds correct paths', () => {
    expect(resolveFlowDrillPath('edit', 'flow-123')).toBe('/app/flows/flow-123/edit');
    expect(resolveFlowDrillPath('overview', 'abc')).toBe('/app/flows/abc/overview');
  });
});





