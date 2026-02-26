import { PageHeader } from '@/components/common/PageHeader';

export default function Commands() {
  return (
    <>
      <PageHeader
        title="Commands"
        subtitle="Placeholder surface for command catalog and execution (future)."
      />
      <div className="rounded-md border p-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Coming soon</span>
          <span className="text-sm text-muted-foreground">
            This page will host reusable commands that agents can invoke through MCP tooling.
          </span>
        </div>
      </div>
    </>
  );
}
