import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export function Component() {
  useShellHeaderTitle({ title: 'Traces', breadcrumbs: ['Observability', 'Traces'] });

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-foreground">Traces</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Distributed tracing across pipeline stages - follow requests from source to destination.
        </p>
      </div>
    </div>
  );
}
