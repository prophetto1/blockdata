import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import FlowCanvas from '@/components/flows/FlowCanvas';
import type { FlowTask } from '@/components/flows/nocode/flow-document';

const GENERIC_CANVAS_TASKS: FlowTask[] = [
  {
    id: 'lock-approved-plan',
    type: 'workflow.plan.contract',
    description: 'Approved plan defines the source contract.',
  },
  {
    id: 'write-frontend-instruction',
    type: 'workflow.frontend.instruction',
    description: 'Instruction layer translates the plan into executable UI work.',
  },
  {
    id: 'execute-and-verify',
    type: 'workflow.execution.verify',
    description: 'Workers implement against the instruction and verify structure in-browser.',
  },
];

export function Component() {
  useShellHeaderTitle({
    title: 'Skill-Driven Dev',
    breadcrumbs: ['Superuser', 'Skill-Driven Dev'],
  });

  return (
    <main className="h-full w-full min-h-0 p-2">
      <div className="h-full min-h-0 overflow-hidden rounded-md border border-border bg-card">
        <div className="h-full min-h-0" data-testid="skill-driven-dev-canvas">
          <FlowCanvas tasks={GENERIC_CANVAS_TASKS} />
        </div>
      </div>
    </main>
  );
}
