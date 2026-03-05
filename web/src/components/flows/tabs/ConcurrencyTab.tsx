import { FlowEmptyState } from './FlowEmptyState';

export function ConcurrencyTab() {
  return (
    <FlowEmptyState
      title="No limits are set for this Flow."
      subtitle="Configure concurrency limits to control how many executions of this flow can run simultaneously."
    />
  );
}
