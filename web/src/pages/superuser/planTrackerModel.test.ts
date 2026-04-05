import { describe, expect, it } from 'vitest';

import {
  buildArtifactFilename,
  getAvailableWorkflowActions,
  groupPlanDocuments,
  nextVersionNumber,
  normalizeArtifactType,
  noteArtifactTypeForState,
  parsePlanTrackerDocument,
  resolveControllingArtifact,
  resolveControllingLifecycleState,
  serializePlanTrackerDocument,
} from './planTrackerModel';

describe('planTrackerModel', () => {
  it('parses legacy artifact values but serializes canonical tracker metadata', () => {
    const source = `---
title: Refactor Database Schema Evaluation
description: Reviews the draft schema refactor.
planId: PLAN-003
artifactType: evaluation
status: under-review
version: 2
productL1: blockdata
productL2: backend-services
productL3: schema-refactor
createdAt: 2026-04-03T14:00:00Z
updatedAt: 2026-04-03T14:30:00Z
reviewer: TRK-55
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
    expect(parsed.metadata.artifactType).toBe('review-note');
    expect(parsed.metadata.version).toBe(2);
    expect(parsed.body.trim()).toContain('# Schema Evaluation');

    const serialized = serializePlanTrackerDocument(parsed.metadata, parsed.body);
    expect(serialized).toContain('artifactType: review-note');
    expect(serialized).toContain('productL1: blockdata');
    expect(serialized).toContain('# Schema Evaluation');
  });

  it('groups legacy files into one plan unit and resolves the latest plan artifact as controlling', () => {
    const grouped = groupPlanDocuments([
      {
        path: 'docs/plans/refactor-database-schema.md',
        content: `---
title: Refactor Database Schema
planId: refactor-database-schema
artifactType: plan
status: approved
version: 1
updatedAt: 2026-04-01T10:00:00Z
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
updatedAt: 2026-04-02T10:00:00Z
---
# Refactor Database Schema
`,
      },
      {
        path: 'docs/plans/refactor-database-schema.v2.evaluation.2.md',
        content: `---
title: Review Note v2.2
planId: refactor-database-schema
artifactType: evaluation
status: rejected
version: 2
updatedAt: 2026-04-03T10:00:00Z
---
# Review Note v2.2
`,
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].artifacts.map((artifact) => artifact.artifactType)).toEqual([
      'plan',
      'plan',
      'review-note',
    ]);
    expect(resolveControllingArtifact(grouped[0])?.path).toBe('docs/plans/refactor-database-schema.v2.md');
    expect(resolveControllingLifecycleState(grouped[0])).toBe('to-do');
    expect(grouped[0].artifacts.find((artifact) => artifact.path.endsWith('evaluation.2.md'))?.sequence).toBe(2);
  });

  it('normalizes artifact types and returns lifecycle-gated workflow actions', () => {
    expect(normalizeArtifactType('evaluation')).toBe('review-note');
    expect(normalizeArtifactType('approval')).toBe('approval-note');
    expect(normalizeArtifactType('verification-note')).toBe('verification-note');

    const underReviewPlan = groupPlanDocuments([
      {
        path: 'docs/plans/refactor-database-schema.md',
        content: `---
title: Refactor Database Schema
planId: refactor-database-schema
artifactType: plan
status: under-review
version: 1
updatedAt: 2026-04-04T10:00:00Z
---
# Refactor Database Schema
`,
      },
    ])[0];

    expect(getAvailableWorkflowActions(underReviewPlan)).toEqual([
      { id: 'send-back', label: 'Send Back' },
      { id: 'approve', label: 'Approve' },
    ]);
  });

  it('builds canonical deterministic artifact filenames and increments plan versions', () => {
    expect(nextVersionNumber(2)).toBe(3);
    expect(buildArtifactFilename({ planStem: 'refactor-database-schema', artifactType: 'plan', version: 3 })).toBe(
      'refactor-database-schema.v3.md',
    );
    expect(
      buildArtifactFilename({
        planStem: 'refactor-database-schema',
        artifactType: 'review-note',
        version: 3,
        sequence: 2,
      }),
    ).toBe('refactor-database-schema.v3.review.2.md');
    expect(
      buildArtifactFilename({
        planStem: 'refactor-database-schema',
        artifactType: 'approval-note',
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

  it('maps ad hoc note creation by coarse phase and reserves closure-note for close action only', () => {
    expect(noteArtifactTypeForState('to-do')).toBe('review-note');
    expect(noteArtifactTypeForState('under-review')).toBe('review-note');
    expect(noteArtifactTypeForState('approved')).toBe('implementation-note');
    expect(noteArtifactTypeForState('implemented')).toBe('implementation-note');
    expect(noteArtifactTypeForState('verified')).toBe('verification-note');
    expect(noteArtifactTypeForState('closed')).toBe('verification-note');
  });
});
