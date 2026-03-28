import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export function Component() {
  useShellHeaderTitle({ title: 'Knowledge Bases', breadcrumbs: ['Pipeline Services', 'Knowledge Bases'] });

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-foreground">Knowledge Bases</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Organize owned sources into reusable retrieval assets and pipeline-service workflows.
        </p>
      </div>
    </div>
  );
}
