import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export function Component() {
  useShellHeaderTitle({ title: 'MCP', breadcrumbs: ['Build AI / Agents', 'MCP'] });

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold text-foreground">MCP Tools</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Configure Model Context Protocol servers and tools available to agents.
        </p>
      </div>
    </div>
  );
}
