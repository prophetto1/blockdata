import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  groupPlanDocuments,
  isTrackerMetadataComplete,
  resolveControllingArtifact,
  resolveControllingLifecycleState,
} from './planTrackerModel';

const ALL_LIFECYCLE_STATES = [
  'to-do',
  'in-progress',
  'under-review',
  'approved',
  'implemented',
  'verified',
  'closed',
] as const;

function collectMarkdownFiles(root: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === '.md') {
      results.push(fullPath);
    }
  }

  return results.sort();
}

describe('plan-tracker canonical workspace seed', () => {
  it('covers every lifecycle state with tracker-managed metadata and artifact variety', () => {
    const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../plan-tracker');

    expect(existsSync(workspaceRoot)).toBe(true);

    const markdownFiles = collectMarkdownFiles(workspaceRoot);
    expect(markdownFiles.length).toBeGreaterThanOrEqual(7);

    const documents = markdownFiles.map((filePath) => ({
      path: relative(workspaceRoot, filePath).replace(/\\/g, '/'),
      content: readFileSync(filePath, 'utf8'),
    }));

    const grouped = groupPlanDocuments(documents);
    const controllingStates = grouped.map((plan) => resolveControllingLifecycleState(plan)).sort();
    const controllingArtifacts = grouped.map((plan) => resolveControllingArtifact(plan)).filter(Boolean);
    const allArtifacts = grouped.flatMap((plan) => plan.artifacts);
    const artifactTypes = new Set(allArtifacts.map((artifact) => artifact.artifactType));

    expect(grouped.length).toBeGreaterThanOrEqual(ALL_LIFECYCLE_STATES.length);
    expect([...new Set(controllingStates)].sort()).toEqual([...ALL_LIFECYCLE_STATES].sort());
    expect(controllingArtifacts).toHaveLength(grouped.length);
    expect(controllingArtifacts.every((artifact) => artifact && isTrackerMetadataComplete(artifact))).toBe(true);

    expect(artifactTypes.has('plan')).toBe(true);
    expect(artifactTypes.has('review-note')).toBe(true);
    expect(artifactTypes.has('approval-note')).toBe(true);
    expect(artifactTypes.has('implementation-note')).toBe(true);
    expect(artifactTypes.has('verification-note')).toBe(true);
    expect(artifactTypes.has('closure-note')).toBe(true);

    expect(allArtifacts.some((artifact) => artifact.metadata.owner?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.reviewer?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.tags?.length)).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.relatedArtifacts?.length)).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.supersedesArtifactId?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.notes?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.priority?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.trackerId?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.productArea?.trim())).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.metadata.functionalArea?.trim())).toBe(true);
  });
});
