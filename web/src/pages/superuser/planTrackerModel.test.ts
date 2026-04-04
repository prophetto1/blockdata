import { describe, expect, it } from 'vitest';

import {
  buildArtifactFilename,
  groupPlanDocuments,
  nextVersionNumber,
  parsePlanTrackerDocument,
  serializePlanTrackerDocument,
} from './planTrackerModel';

describe('planTrackerModel', () => {
  it('parses and serializes normalized tracker frontmatter', () => {
    const source = `---
title: Refactor Database Schema Evaluation
description: Reviews the draft schema refactor.
planId: PLAN-003
artifactType: evaluation
status: under-review
version: 2
productArea: blockdata
functionalArea: backend-services
updatedAt: 2026-04-03T14:30:00Z
trackerId: TRK-55
---
# Schema Evaluation

Current schema limitations identified.
`;

    const parsed = parsePlanTrackerDocument({
      path: 'docs/plans/refactor-database-schema-plan-evaluation.md',
      content: source,
    });

    expect(parsed.metadata.title).toBe('Refactor Database Schema Evaluation');
    expect(parsed.metadata.planId).toBe('PLAN-003');
    expect(parsed.metadata.artifactType).toBe('evaluation');
    expect(parsed.metadata.version).toBe(2);
    expect(parsed.body.trim()).toContain('# Schema Evaluation');

    const serialized = serializePlanTrackerDocument(parsed.metadata, parsed.body);
    expect(serialized).toContain('artifactType: evaluation');
    expect(serialized).toContain('planId: PLAN-003');
    expect(serialized).toContain('# Schema Evaluation');
  });

  it('groups legacy files into one plan unit using filename heuristics when metadata is absent', () => {
    const grouped = groupPlanDocuments([
      {
        path: 'docs/plans/refactor-database-schema.md',
        content: '# Refactor Database Schema',
      },
      {
        path: 'docs/plans/refactor-database-schema-plan-evaluation.md',
        content: '## Evaluation notes',
      },
      {
        path: 'docs/plans/refactor-database-schema-plan-reevaluation.md',
        content: '## Reevaluation notes',
      },
      {
        path: 'docs/plans/refactor-database-schema-implementation-evaluation.md',
        content: '## Implementation evaluation',
      },
      {
        path: 'docs/plans/refactor-database-schema-status-report.md',
        content: '## Status report',
      },
      {
        path: 'docs/plans/refactor-database-schema-v2.md',
        content: '# Refactor Database Schema v2',
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].planId).toBe('refactor-database-schema');
    expect(grouped[0].artifacts.map((artifact) => artifact.artifactType)).toEqual([
      'plan',
      'plan',
      'evaluation',
      'evaluation',
      'implementation-evaluation',
      'status-report',
    ]);
    expect(grouped[0].artifacts.map((artifact) => artifact.version)).toEqual([1, 2, 1, 1, 1, 1]);
  });

  it('builds deterministic artifact filenames and increments plan versions', () => {
    expect(nextVersionNumber(2)).toBe(3);
    expect(buildArtifactFilename({ planStem: 'refactor-database-schema', artifactType: 'plan', version: 3 })).toBe(
      'refactor-database-schema.v3.md',
    );
    expect(
      buildArtifactFilename({
        planStem: 'refactor-database-schema',
        artifactType: 'evaluation',
        version: 3,
        sequence: 2,
      }),
    ).toBe('refactor-database-schema.v3.evaluation.2.md');
    expect(
      buildArtifactFilename({
        planStem: 'refactor-database-schema',
        artifactType: 'approval',
        version: 3,
        sequence: 1,
      }),
    ).toBe('refactor-database-schema.v3.approval.1.md');
    expect(
      buildArtifactFilename({
        planStem: 'refactor-database-schema',
        artifactType: 'implementation-note',
        version: 3,
        sequence: 1,
      }),
    ).toBe('refactor-database-schema.v3.implementation.1.md');
    expect(
      buildArtifactFilename({
        planStem: 'refactor-database-schema',
        artifactType: 'verification-note',
        version: 3,
        sequence: 4,
      }),
    ).toBe('refactor-database-schema.v3.verification.4.md');
  });

  it('treats the latest plan revision as canonical and infers sequence numbers from deterministic filenames', () => {
    const grouped = groupPlanDocuments([
      {
        path: 'docs/plans/refactor-database-schema.md',
        content: `---
title: Refactor Database Schema
planId: refactor-database-schema
artifactType: plan
status: approved
version: 1
---
# Refactor Database Schema
`,
      },
      {
        path: 'docs/plans/refactor-database-schema.v2.md',
        content: `---
title: Refactor Database Schema
planId: refactor-database-schema
artifactType: plan
status: draft
version: 2
---
# Refactor Database Schema
`,
      },
      {
        path: 'docs/plans/refactor-database-schema.v2.evaluation.2.md',
        content: `---
title: Evaluation v2.2
planId: refactor-database-schema
artifactType: evaluation
status: rejected
version: 2
---
# Evaluation v2.2
`,
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].status).toBe('draft');
    expect(grouped[0].artifacts.find((artifact) => artifact.path.endsWith('evaluation.2.md'))?.sequence).toBe(2);
  });
});
