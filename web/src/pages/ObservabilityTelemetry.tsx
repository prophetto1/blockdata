import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export function Component() {
  useShellHeaderTitle({ title: 'Telemetry', breadcrumbs: ['Observability', 'Telemetry'] });

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-foreground">Telemetry</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Monitor pipeline execution metrics, service health, and resource utilization.
        </p>
      </div>
    </div>
  );
}
