import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanStateNavigator } from './PlanStateNavigator';
import type { PlanUnit } from './planTrackerModel';

function createPlan(overrides: Partial<PlanUnit> = {}): PlanUnit {
  return {
    planId: 'plan-1',
    title: 'Refactor Database Schema',
    status: 'under-review',
    productArea: 'blockdata',
    functionalArea: 'backend',
    artifacts: [
      {
        artifactId: 'plan-1:/docs/plans/refactor-database-schema.md',
        planId: 'plan-1',
        title: 'Refactor Database Schema',
        artifactType: 'plan',
        status: 'under-review',
        version: 1,
        path: 'docs/plans/refactor-database-schema.md',
        content: '# Refactor Database Schema',
        body: '# Refactor Database Schema',
        metadata: {
          title: 'Refactor Database Schema',
          planId: 'plan-1',
          artifactType: 'plan',
          status: 'under-review',
          version: 1,
          updatedAt: '2026-04-04T00:00:00Z',
        },
      },
      {
        artifactId: 'plan-1:/docs/plans/refactor-database-schema.v1.approval.1.md',
        planId: 'plan-1',
        title: 'Approval Note',
        artifactType: 'approval-note',
        status: 'approved',
        version: 1,
        path: 'docs/plans/refactor-database-schema.v1.approval.1.md',
        content: '# Approval Note',
        body: '# Approval Note',
        metadata: {
          title: 'Approval Note',
          planId: 'plan-1',
          artifactType: 'approval-note',
          status: 'approved',
          version: 1,
          updatedAt: '2026-04-04T00:00:00Z',
        },
      },
    ],
    ...overrides,
  };
}

describe('PlanStateNavigator', () => {
  it('filters plan rows by lifecycle tab and shows counts', () => {
    render(
      <PlanStateNavigator
        activeState="under-review"
        onChangeState={vi.fn()}
        planUnits={[
          createPlan(),
          createPlan({
            planId: 'plan-2',
            title: 'Implement User Authentication',
            status: 'draft',
            artifacts: [createPlan().artifacts[0]],
          }),
        ]}
        hasDirectory
        selectedPlanId={null}
        selectedArtifactId={null}
        onSelectPlan={vi.fn()}
        onSelectArtifact={vi.fn()}
      />,
    );

    expect(screen.getByText('Under Review')).toBeInTheDocument();
    expect(screen.getByText('Refactor Database Schema')).toBeInTheDocument();
    expect(screen.queryByText('Implement User Authentication')).not.toBeInTheDocument();
  });

  it('reveals nested artifact rows for the selected plan and notifies selection', () => {
    const onSelectArtifact = vi.fn();
    const plan = createPlan();

    render(
      <PlanStateNavigator
        activeState="under-review"
        onChangeState={vi.fn()}
        planUnits={[plan]}
        hasDirectory
        selectedPlanId="plan-1"
        selectedArtifactId={plan.artifacts[0].artifactId}
        onSelectPlan={vi.fn()}
        onSelectArtifact={onSelectArtifact}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /approval note/i }));

    expect(screen.getByText('Approval Note')).toBeInTheDocument();
    expect(onSelectArtifact).toHaveBeenCalledWith(plan.artifacts[1].artifactId);
  });

  it('shows the pre-directory scaffold before a plans directory is connected', () => {
    const { container } = render(
      <PlanStateNavigator
        activeState="under-review"
        onChangeState={vi.fn()}
        planUnits={[createPlan()]}
        hasDirectory={false}
        selectedPlanId={null}
        selectedArtifactId={null}
        onSelectPlan={vi.fn()}
        onSelectArtifact={vi.fn()}
      />,
    );

    const navigator = container.querySelector('[data-testid="plan-state-navigator"]');
    expect(navigator).not.toBeNull();
    const scoped = within(navigator as HTMLElement);

    expect(scoped.getByText('Open the plans directory')).toBeInTheDocument();
    expect(scoped.queryByText('Refactor Database Schema')).not.toBeInTheDocument();
  });
});
