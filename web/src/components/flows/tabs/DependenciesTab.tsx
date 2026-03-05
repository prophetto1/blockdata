import { FlowEmptyState } from './FlowEmptyState';

export function DependenciesTab() {
  return (
    <FlowEmptyState
      title="No dependencies detected."
      subtitle="Dependencies will appear here when this flow references or is referenced by other flows."
    />
  );
}
