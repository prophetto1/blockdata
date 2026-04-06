import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanMetadataPane } from './PlanMetadataPane';
import type { PlanUnit } from './planTrackerModel';

const plan: PlanUnit = {
  planId: 'user-storage-signup-verification',
  title: 'User Storage Signup Verification Implementation Plan',
  status: 'to-do',
  productArea: 'storage',
  functionalArea: 'onboarding',
  artifacts: [
    {
      artifactId: 'artifact-1',
      planId: 'user-storage-signup-verification',
      title: 'User Storage Signup Verification Implementation Plan',
      artifactType: 'plan',
      status: 'to-do',
      version: 1,
      path: 'plan-tracker/user-storage-signup-verification.v1.md',
      content: '# User Storage Signup Verification Implementation Plan',
      body: '# User Storage Signup Verification Implementation Plan',
      metadata: {
        title: 'User Storage Signup Verification Implementation Plan',
        planId: 'user-storage-signup-verification',
        artifactType: 'plan',
        status: 'to-do',
        version: 1,
        productL1: 'storage',
        productL2: 'onboarding',
        productL3: 'signup-verification',
        createdAt: '2026-03-21T09:00:00Z',
        updatedAt: '2026-03-21T09:00:00Z',
      },
    },
  ],
};

describe('PlanMetadataPane', () => {
  it('starts directly with the locked inspector sections instead of a redundant Inspector banner', () => {
    render(
      <PlanMetadataPane
        plan={plan}
        artifact={plan.artifacts[0]}
        dirty={false}
        pendingAction={null}
        availableActions={[]}
        onAction={vi.fn()}
        onResolvePendingAction={vi.fn()}
        onCreateNote={vi.fn()}
      />,
    );

    expect(screen.queryByText('Inspector')).not.toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Classification')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Workflow Actions')).toBeInTheDocument();
    expect(screen.getByText('Notes / Action Composer')).toBeInTheDocument();
    expect(screen.getByText('Related Artifacts')).toBeInTheDocument();
  });
});
