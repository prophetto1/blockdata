import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { WorkflowEditorSurface } from '@/components/workflow/WorkflowEditorSurface';

const STORAGE_KEY = 'superuser.skill-driven-dev.graph.v1';

export function Component() {
  useShellHeaderTitle({
    title: 'Skill-Driven Dev',
    breadcrumbs: ['Superuser', 'Skill-Driven Dev'],
  });

  return (
    <main className="h-full w-full min-h-0 p-2">
      <WorkflowEditorSurface storageKey={STORAGE_KEY} canvasTestId="skill-driven-dev-canvas" />
    </main>
  );
}
