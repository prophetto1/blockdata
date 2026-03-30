import { describe, expect, it } from 'vitest';

import {
  PIPELINE_NAV,
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
    expect(paths).toContain('/app/pipeline-services');
    expect(paths).toContain('/app/onboarding/agents');
    expect(paths).toContain('/app/parse');
    expect(paths).not.toContain('/app/rag');
    expect(paths).not.toContain('/app/knowledge-bases');
    expect(paths).toContain('/app/flows');
    expect(paths).toContain('/app/observability');
    expect(paths).toContain('/app/settings');
    expect(paths).not.toContain('/app/pipeline-services/knowledge-bases');
    expect(paths).not.toContain('/app/pipeline-services/index-builder');
    expect(paths).not.toContain('/app/extract');
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

  it('keeps drill children under their parent sections instead of the top-level nav', () => {
    const paths = ALL_TOP_LEVEL_ITEMS.map((item) => item.path);
    const ingestConfig = getDrillConfig('ingest');
    const pipelineServicesConfig = getDrillConfig('pipeline-services');

    expect(paths).not.toContain('/app/extract');
    expect(paths).not.toContain('/app/transform');
    expect(paths).not.toContain('/app/pipeline-services/knowledge-bases');
    expect(paths).not.toContain('/app/pipeline-services/index-builder');
    expect(ingestConfig?.sections.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/extract');
    expect(ingestConfig?.sections.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/transform');
    expect(pipelineServicesConfig?.sections.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/pipeline-services');
    expect(pipelineServicesConfig?.sections.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/pipeline-services/knowledge-bases');
    expect(paths).toContain('/app/onboarding/agents');
    expect(paths).toContain('/app/marketplace/integrations');
    expect(paths).toContain('/app/tests');
    expect(paths).not.toContain('/app/docs');
  });

  it('does not expose RAG as a user-facing nav label', () => {
    const labels = ALL_TOP_LEVEL_ITEMS.map((item) => item.label);

    expect(labels).not.toContain('RAG');
  });

  it('marks drill items with drillId', () => {
    const drillItems = ALL_TOP_LEVEL_ITEMS.filter((item) => item.drillId);
    const drillIds = drillItems.map((item) => item.drillId);

    expect(drillIds).toContain('flows');
    expect(drillIds).toContain('settings');
  });

  it('keeps Assets label consistent in the nav', () => {
    const activeAssets = ALL_TOP_LEVEL_ITEMS.filter((item) => item.path === '/app/assets').map((item) => item.label);

    expect(activeAssets).toContain('Assets');
    expect(activeAssets).not.toContain('Aggregate Sources');
  });

  it('keeps index builder nested under Pipeline Services drill', () => {
    const config = getDrillConfig('pipeline-services');

    expect(config?.sections.flatMap((s) => s.items).map((item) => item.path)).toEqual([
      '/app/pipeline-services',
      '/app/pipeline-services/knowledge-bases',
      '/app/pipeline-services/index-builder',
    ]);
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

  it('finds the settings drill from a settings route', () => {
    expect(findDrillByRoute('/app/settings/profile')?.id).toBe('settings');
  });

  it('keeps knowledge bases under the pipeline services drill', () => {
    const config = getDrillConfig('pipeline-services');

    expect(config?.sections.flatMap((section) => section.items).map((item) => item.path)).toEqual([
      '/app/pipeline-services',
      '/app/pipeline-services/knowledge-bases',
      '/app/pipeline-services/index-builder',
    ]);
  });

  it('finds the pipeline services drill for overview and detail routes', () => {
    expect(findDrillByRoute('/app/pipeline-services')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/pipeline-services/knowledge-bases')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/pipeline-services/index-builder')?.id).toBe('pipeline-services');
    expect(findDrillByRoute('/app/rag/index-builder')?.id).toBe('pipeline-services');
  });

  it('resolves flow drill paths with flow ids', () => {
    expect(resolveFlowDrillPath('overview', 'default-flow')).toBe(
      '/app/flows/default-flow/overview',
    );
  });
});
